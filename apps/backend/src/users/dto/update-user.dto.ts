import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@workflow-brasal/shared';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

/** Only an ADMIN may hit PATCH /users/:id — this is the sole way to change role/isActive. */
export class UpdateUserDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
