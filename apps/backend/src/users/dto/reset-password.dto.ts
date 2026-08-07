import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { STRONG_PASSWORD_MESSAGE, STRONG_PASSWORD_REGEX } from '../../auth/dto/register.dto';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  newPassword: string;
}
