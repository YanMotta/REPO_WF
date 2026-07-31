import { ApiProperty } from '@nestjs/swagger';
import { IsInt, ValidateIf } from 'class-validator';

export class ChangeCoResponsibleDto {
  @ApiProperty({ nullable: true, description: 'null clears the co-responsible.' })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  coResponsibleId: number | null;
}
