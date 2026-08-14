import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@workflow-brasal/shared';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

/** Only an ADMIN may hit PATCH /users/:id. No `email` field — changing it is identity-sensitive
 * (it's both the login and the password-reset destination), so it's self-service only, via
 * AuthService.changeEmail's verified-token flow. */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
