import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityPriority } from '@workflow-brasal/shared';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Deliberately excludes `status`, `exceededHours`, `businessDayOffset`, `dueDateRuleMonth`,
 * `dueDateRuleYear`, `templateId` and `projectId` — none of these are client-settable through a
 * plain PATCH. `dueDateRuleMonth`/`dueDateRuleYear` in particular must survive a manual `deadline`
 * edit unchanged (they're the idempotency key for monthly closure generation), which is only
 * possible to guarantee if the DTO shape makes overwriting them structurally impossible.
 * Status changes go through PATCH /activities/:id/status; responsible changes through
 * PATCH /activities/:id/responsible.
 */
export class UpdateActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ActivityPriority })
  @IsOptional()
  @IsEnum(ActivityPriority)
  priority?: ActivityPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Manual deadline override. Setting this clears businessDayOffset but preserves ' +
      'dueDateRuleMonth/dueDateRuleYear (closure-generation idempotency key).',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
