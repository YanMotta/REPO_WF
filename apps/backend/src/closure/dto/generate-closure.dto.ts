import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

/**
 * Both fields optional — omitted means "current server month/year". Even when supplied,
 * ClosureService.generateForMonth's past-month guard is the actual enforcement boundary, not this
 * DTO — a client should never be able to force regeneration of an already-closed month.
 */
export class GenerateClosureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  year?: number;
}
