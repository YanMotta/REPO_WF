import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@workflow-brasal/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { verificationToken: token } });
  }

  findByPasswordResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { passwordResetToken: token } });
  }

  async setPasswordResetToken(id: number, token: string, expiresAt: Date): Promise<User> {
    const user = await this.findById(id);
    user.passwordResetToken = token;
    user.passwordResetTokenExpiresAt = expiresAt;
    return this.usersRepository.save(user);
  }

  /** Always creates a MEMBER, pending e-mail verification — role escalation only happens through
   * `update`. */
  createMember(data: {
    name: string;
    email: string;
    passwordHash: string;
    verificationToken: string;
    verificationTokenExpiresAt: Date;
  }): Promise<User> {
    const user = this.usersRepository.create({
      ...data,
      role: Role.MEMBER,
      isActive: true,
      isVerified: false,
    });
    return this.usersRepository.save(user);
  }

  /**
   * Auto-provisions a MEMBER account the first time someone signs in via Microsoft Entra ID.
   * `isVerified: true` immediately — corporate SSO is already stronger proof of identity than our
   * own e-mail-link verification. `passwordHash` is a random value never handed to the user, so
   * local e-mail/password login stays impossible for this account (it only ever authenticates via
   * Entra) without needing a nullable-password schema change.
   */
  async createFromEntra(data: { name: string; email: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
    const user = this.usersRepository.create({
      ...data,
      passwordHash,
      role: Role.MEMBER,
      isActive: true,
      isVerified: true,
    });
    return this.usersRepository.save(user);
  }

  /**
   * Admin-created account (audit finding #4 — previously the only way for an account to exist was
   * self-registration). Already active and verified — an admin vouching for the account is
   * stronger proof than the person clicking their own e-mail link. `passwordHash` is a random
   * value never handed to anyone; AuthService.createUserByAdmin immediately follows up with a
   * password-reset-token e-mail so the new person sets their own password before ever logging in.
   */
  async createByAdmin(data: { name: string; email: string; role: Role }): Promise<User> {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
    const user = this.usersRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      isActive: true,
      isVerified: true,
    });
    return this.usersRepository.save(user);
  }

  async markVerified(id: number): Promise<User> {
    const user = await this.findById(id);
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiresAt = null;
    return this.usersRepository.save(user);
  }

  async setVerificationToken(id: number, token: string, expiresAt: Date): Promise<User> {
    const user = await this.findById(id);
    user.verificationToken = token;
    user.verificationTokenExpiresAt = expiresAt;
    return this.usersRepository.save(user);
  }

  /** currentUserId guards against an admin deactivating or self-demoting their own account. */
  async update(id: number, dto: UpdateUserDto, currentUserId: number): Promise<User> {
    if (id === currentUserId && (dto.isActive === false || (dto.role && dto.role !== Role.ADMIN))) {
      throw new ForbiddenException('Você não pode alterar seu próprio acesso de administrador');
    }

    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  findByEmailChangeToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { emailChangeToken: token } });
  }

  async setPendingEmailChange(
    id: number,
    pendingEmail: string,
    token: string,
    expiresAt: Date,
  ): Promise<User> {
    const user = await this.findById(id);
    user.pendingEmail = pendingEmail;
    user.emailChangeToken = token;
    user.emailChangeTokenExpiresAt = expiresAt;
    return this.usersRepository.save(user);
  }

  /** Applies the pending e-mail and clears the token trio in the same write — mirrors
   * resetPassword's "consume + apply atomically" shape. */
  async confirmEmailChange(id: number, newEmail: string): Promise<User> {
    const user = await this.findById(id);
    user.email = newEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeTokenExpiresAt = null;
    return this.usersRepository.save(user);
  }

  /** Sets a new password and invalidates any pending reset token in the same write — used
   * exclusively by the self-service forgot-password flow now (AuthService.resetPassword). */
  async resetPassword(id: number, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    await this.usersRepository.save(user);
  }
}
