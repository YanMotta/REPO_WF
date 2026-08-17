import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class EntraCallbackDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;
}
