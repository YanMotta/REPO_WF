import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class DeleteClosureDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  month: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  year: number;
}
