import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityPriority } from '@workflow-brasal/shared';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/**
 * A new activity is either rule-based (businessDayOffset + dueDateRuleMonth/Year -> deadline
 * resolved server-side) or manual (deadline supplied directly, businessDayOffset stays null).
 * `status` is deliberately absent — initial status is always derived by the service from
 * whether dependencies are supplied (see ActivitiesService.resolveInitialStatus).
 */
export class CreateActivityDto {
  @ApiProperty()
  @IsInt()
  projectId: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  responsibleId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  coResponsibleId?: number;

  @ApiPropertyOptional({ enum: ActivityPriority })
  @IsOptional()
  @IsEnum(ActivityPriority)
  priority?: ActivityPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Manual deadline. Omit when using businessDayOffset.' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Signed business-day offset; requires dueDateRuleMonth/Year.' })
  @IsOptional()
  @IsInt()
  businessDayOffset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  dueDateRuleMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  dueDateRuleYear?: number;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime must be in "HH:mm" format' })
  dueTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  templateId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [Number], description: 'IDs of activities this one depends on.' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  dependsOnActivityIds?: number[];
}
