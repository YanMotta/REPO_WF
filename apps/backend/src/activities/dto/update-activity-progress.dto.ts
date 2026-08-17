import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * The subset of UpdateActivityDto's fields safe to hand to whoever is actually doing the work
 * (the responsible/co-responsible), guarded by ActivityOwnershipGuard rather than admin-only —
 * title/priority/deadline etc. stay behind PATCH /activities/:id (admin-only).
 */
export class UpdateActivityProgressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
