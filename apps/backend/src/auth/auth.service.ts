import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from '@workflow-brasal/shared';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

function toUserDto(user: User): UserDto {
  const { id, name, email, role, isActive } = user;
  return { id, name, email, role, isActive };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: UserDto }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.createMember({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: UserDto }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciais inválidas');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Credenciais inválidas');

    return this.buildAuthResponse(user);
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
