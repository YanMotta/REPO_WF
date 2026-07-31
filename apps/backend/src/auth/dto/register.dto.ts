import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Deliberately has no `role` field — self-registration always creates a MEMBER
 * (see AuthService.register). Promotion to ADMIN/MANAGER only via PATCH /users/:id.
 */
export class RegisterDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
