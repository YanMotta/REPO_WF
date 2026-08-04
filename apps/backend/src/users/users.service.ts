import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@workflow-brasal/shared';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
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

  /** Always creates a MEMBER — role escalation only happens through `update`. */
  createMember(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    const user = this.usersRepository.create({ ...data, role: Role.MEMBER, isActive: true });
    return this.usersRepository.save(user);
  }

  /** Admin-driven creation with an explicit role — used by POST /users. */
  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      isActive: true,
    });
    return this.usersRepository.save(user);
  }

  /** currentUserId guards against an admin deactivating or self-demoting their own account. */
  async update(id: number, dto: UpdateUserDto, currentUserId: number): Promise<User> {
    if (id === currentUserId && (dto.isActive === false || (dto.role && dto.role !== Role.ADMIN))) {
      throw new ForbiddenException('Você não pode alterar seu próprio acesso de administrador');
    }

    const user = await this.findById(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) throw new ConflictException('E-mail já cadastrado');
    }

    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async resetPassword(id: number, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersRepository.save(user);
  }
}
