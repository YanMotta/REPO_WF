import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from '@workflow-brasal/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

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
