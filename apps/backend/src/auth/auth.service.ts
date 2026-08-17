import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Role, UserDto } from '@workflow-brasal/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Sign-in only — no Mail.Send/Graph scopes here. That's a separate integration (see roadmap
 * Fase 4) with its own consent requirements; keeping this scope minimal is least-privilege and
 * means IT has less to grant just to unblock login. */
const ENTRA_LOGIN_SCOPES = ['openid', 'profile', 'email'];

const SALT_ROUNDS = 10;

function toUserDto(user: User): UserDto {
  const { id, name, email, role, isActive } = user;
  return { id, name, email, role, isActive };
}

/** Strips control characters (defense against header injection if this ever lands in an
 * e-mail subject) and caps whitespace. */
function sanitizeName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly msalClient: ConfidentialClientApplication | null;
  private readonly entraRedirectUri: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    const tenantId = this.configService.get<string>('ENTRA_TENANT_ID');
    const clientId = this.configService.get<string>('ENTRA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ENTRA_CLIENT_SECRET');
    this.entraRedirectUri = this.configService.get<string>(
      'ENTRA_REDIRECT_URI',
      'http://localhost:5173/auth/entra/callback',
    );

    // null until IT provisions the App Registration and these three env vars are filled in —
    // every Entra method below checks this and fails gracefully rather than crashing the app.
    this.msalClient =
      tenantId && clientId && clientSecret
        ? new ConfidentialClientApplication({
            auth: { clientId, clientSecret, authority: `https://login.microsoftonline.com/${tenantId}` },
          })
        : null;
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiresAt = this.buildTokenExpiry();

    const user = await this.usersService.createMember({
      name: sanitizeName(dto.name),
      email: dto.email,
      passwordHash,
      verificationToken,
      verificationTokenExpiresAt,
    });

    await this.sendVerificationEmail(user, verificationToken);

    return { message: 'Cadastro realizado! Verifique seu e-mail para ativar sua conta.' };
  }

  /**
   * Admin-created account (audit finding #4) — the only path to an account before this was
   * self-registration, which meant a manager couldn't actually onboard someone themselves.
   * Already active and verified (see UsersService.createByAdmin); immediately e-mails a
   * password-reset-token link so the new person sets their own password rather than the admin
   * ever knowing or choosing it.
   */
  async createUserByAdmin(dto: CreateUserDto): Promise<{ message: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const user = await this.usersService.createByAdmin({
      name: sanitizeName(dto.name),
      email: dto.email,
      role: dto.role ?? Role.MEMBER,
    });

    const token = generatePasswordResetToken();
    const updated = await this.usersService.setPasswordResetToken(
      user.id,
      token,
      this.buildPasswordResetTokenExpiry(),
    );
    await this.sendWelcomeSetPasswordEmail(updated, token);

    return { message: `Conta criada. Um e-mail foi enviado para ${dto.email} com instruções para definir a senha.` };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: UserDto }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciais inválidas');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Credenciais inválidas');

    // Only reachable once the password has already been proven correct, so this never leaks
    // account-verification state to someone probing e-mails without a valid password.
    if (!user.isVerified) {
      throw new UnauthorizedException('E-mail ainda não verificado. Verifique sua caixa de entrada.');
    }

    return this.buildAuthResponse(user);
  }

  /** Drives the "Entrar com Microsoft" button: while `ENTRA_*` env vars are unset, `configured` is
   * false and the frontend hides the button instead of offering a login path that would just
   * 401 on click. Once set, returns the ready-to-redirect Microsoft authorize URL so the frontend
   * only needs `window.location.href = authorizeUrl` — no client-side URL building. */
  async getEntraLoginInfo(): Promise<{ configured: boolean; authorizeUrl?: string }> {
    if (!this.msalClient) return { configured: false };

    const authorizeUrl = await this.msalClient.getAuthCodeUrl({
      scopes: ENTRA_LOGIN_SCOPES,
      redirectUri: this.entraRedirectUri,
    });
    return { configured: true, authorizeUrl };
  }

  /**
   * Exchanges the authorization code Microsoft redirected back with for tokens, then finds or
   * auto-provisions (see UsersService.createFromEntra) the local User by e-mail (MSAL's
   * `account.username` is the work/school account's UPN, which for the overwhelming majority of
   * tenants is the same as its primary e-mail address). Never touches `passwordHash` for an
   * existing account — an Entra sign-in and a local e-mail/password login can coexist on the same
   * row without interfering with each other.
   */
  async loginWithEntra(code: string): Promise<{ accessToken: string; user: UserDto }> {
    if (!this.msalClient) {
      throw new BadRequestException('Login via Microsoft ainda não foi configurado.');
    }

    let result;
    try {
      result = await this.msalClient.acquireTokenByCode({
        code,
        scopes: ENTRA_LOGIN_SCOPES,
        redirectUri: this.entraRedirectUri,
      });
    } catch (err) {
      this.logger.error(`Entra ID token exchange failed: ${err}`);
      throw new UnauthorizedException('Não foi possível concluir o login com a Microsoft.');
    }

    const email = result?.account?.username;
    if (!email) {
      throw new UnauthorizedException('A Microsoft não retornou um e-mail válido para esta conta.');
    }

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.createFromEntra({ name: result.account?.name ?? email, email });
    } else if (!user.isActive) {
      throw new UnauthorizedException('Esta conta está desativada.');
    }

    return this.buildAuthResponse(user);
  }

  async verifyEmail(token: string): Promise<{ accessToken: string; user: UserDto }> {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) throw new BadRequestException('Link de verificação inválido.');

    if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Link de verificação expirado. Solicite um novo.');
    }

    const verified = await this.usersService.markVerified(user.id);
    return this.buildAuthResponse(verified);
  }

  /** Always responds with the same generic message regardless of whether the e-mail exists or is
   * already verified, to avoid account enumeration. */
  async resendVerification(email: string): Promise<{ message: string }> {
    const message = 'Se o e-mail estiver cadastrado e pendente de verificação, um novo link foi enviado.';

    const user = await this.usersService.findByEmail(email);
    if (!user || user.isVerified) return { message };

    const verificationToken = generateVerificationToken();
    const updated = await this.usersService.setVerificationToken(
      user.id,
      verificationToken,
      this.buildTokenExpiry(),
    );
    await this.sendVerificationEmail(updated, verificationToken);

    return { message };
  }

  /** Always responds with the same generic message regardless of whether the e-mail exists, is
   * inactive, or is fine — mirrors resendVerification's anti-enumeration shape. */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const message = 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.';

    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return { message };

    const passwordResetToken = generatePasswordResetToken();
    const updated = await this.usersService.setPasswordResetToken(
      user.id,
      passwordResetToken,
      this.buildPasswordResetTokenExpiry(),
    );
    await this.sendPasswordResetEmail(updated, passwordResetToken);

    return { message };
  }

  /** No auto-login on success — unlike verifyEmail, changing a credential is sensitive enough
   * that the user should log in explicitly afterward with the new password. */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) throw new BadRequestException('Link de redefinição de senha inválido.');

    if (!user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Link de redefinição de senha expirado. Solicite um novo.');
    }
    // Defensive re-check for the race where an admin deactivates the account between the reset
    // e-mail being sent and the link being used — same generic wording, no distinct signal.
    if (!user.isActive) throw new BadRequestException('Link de redefinição de senha inválido.');

    await this.usersService.resetPassword(user.id, newPassword);
    return { message: 'Senha redefinida com sucesso. Você já pode fazer login com a nova senha.' };
  }

  /** Requires the current password so a hijacked/left-open session can't silently redirect the
   * account's e-mail — the confirmation link itself goes to `newEmail`, not the current one, so
   * nothing is sent anywhere until this check passes. */
  async changeEmail(userId: number, newEmail: string, password: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Senha incorreta');

    if (newEmail === user.email) {
      throw new BadRequestException('O novo e-mail é igual ao atual');
    }

    const existing = await this.usersService.findByEmail(newEmail);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const token = generateVerificationToken();
    const updated = await this.usersService.setPendingEmailChange(userId, newEmail, token, this.buildTokenExpiry());
    await this.sendEmailChangeConfirmation(updated, newEmail, token);

    return { message: 'Enviamos um link de confirmação para o novo e-mail. Ele só passa a valer depois de confirmado.' };
  }

  /** No auto-login — same reasoning as resetPassword: this changes the login credential, so the
   * user should authenticate explicitly afterward with the new e-mail. */
  async confirmEmailChange(token: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmailChangeToken(token);
    if (!user || !user.pendingEmail) throw new BadRequestException('Link de confirmação inválido.');

    if (!user.emailChangeTokenExpiresAt || user.emailChangeTokenExpiresAt < new Date()) {
      throw new BadRequestException('Link de confirmação expirado. Solicite a troca novamente.');
    }

    await this.usersService.confirmEmailChange(user.id, user.pendingEmail);
    return { message: 'E-mail atualizado com sucesso. Faça login novamente com o novo e-mail.' };
  }

  private async sendEmailChangeConfirmation(user: User, newEmail: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const minutes = this.configService.get<number>('EMAIL_VERIFICATION_TTL_MINUTES', 30);
    const link = `${frontendUrl}/confirm-email-change?token=${token}`;

    try {
      await this.notificationsService.sendRaw(
        user.id,
        newEmail,
        'Confirme a troca de e-mail — Workflow Brasal',
        `Olá, ${user.name}!\n\nRecebemos uma solicitação para trocar o e-mail da sua conta para este endereço. Clique no link abaixo para confirmar (válido por ${minutes} minutos):\n\n${link}\n\nSe você não solicitou esta troca, ignore este e-mail — seu e-mail atual continua valendo.`,
      );
    } catch (err) {
      this.logger.error(`Failed to send e-mail change confirmation to user ${user.id}: ${err}`);
    }
  }

  private buildPasswordResetTokenExpiry(): Date {
    const minutes = this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES', 30);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const minutes = this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES', 30);
    const link = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.notificationsService.sendRaw(
        user.id,
        user.email,
        'Redefinição de senha — Workflow Brasal',
        `Olá, ${user.name}!\n\nRecebemos uma solicitação para redefinir a senha da sua conta. Clique no link abaixo para criar uma nova senha (válido por ${minutes} minutos):\n\n${link}\n\nSe você não solicitou esta redefinição, ignore este e-mail — sua senha atual continua válida.`,
      );
    } catch (err) {
      this.logger.error(`Failed to send password reset e-mail to user ${user.id}: ${err}`);
    }
  }

  private async sendWelcomeSetPasswordEmail(user: User, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const minutes = this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES', 30);
    const link = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.notificationsService.sendRaw(
        user.id,
        user.email,
        'Sua conta no Workflow Brasal foi criada',
        `Olá, ${user.name}!\n\nUma conta foi criada para você no Workflow Brasal. Clique no link abaixo para definir sua senha de acesso (válido por ${minutes} minutos):\n\n${link}\n\nApós definir a senha, você já pode fazer login normalmente com seu e-mail.`,
      );
    } catch (err) {
      this.logger.error(`Failed to send welcome e-mail to user ${user.id}: ${err}`);
    }
  }

  private buildTokenExpiry(): Date {
    const minutes = this.configService.get<number>('EMAIL_VERIFICATION_TTL_MINUTES', 30);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private async sendVerificationEmail(user: User, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const link = `${frontendUrl}/verify-email?token=${token}`;

    try {
      await this.notificationsService.sendRaw(
        user.id,
        user.email,
        'Confirme seu cadastro — Workflow Brasal',
        `Olá, ${user.name}!\n\nConfirme seu cadastro clicando no link abaixo (válido por ${this.configService.get<number>('EMAIL_VERIFICATION_TTL_MINUTES', 30)} minutos):\n\n${link}\n\nSe você não solicitou este cadastro, ignore este e-mail.`,
      );
    } catch (err) {
      // Registration/resend still succeeds even if the e-mail send fails transiently — the
      // resend endpoint is the recovery path.
      this.logger.error(`Failed to send verification e-mail to user ${user.id}: ${err}`);
    }
  }

  private buildAuthResponse(user: User): { accessToken: string; user: UserDto } {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken, user: toUserDto(user) };
  }
}
