import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@workflow-brasal/shared';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: Role, description: 'Defaults to MEMBER.' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
