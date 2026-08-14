import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty()
  @IsEmail()
  newEmail: string;

  @ApiProperty({ description: "Current password — confirms it's really the account owner asking." })
  @IsString()
  password: string;
}
