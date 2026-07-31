import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityPriority } from '@workflow-brasal/shared';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  NotEquals,
} from 'class-validator';

export class CreateActivityTemplateDto {
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

  @ApiPropertyOptional({ enum: ActivityPriority })
  @IsOptional()
  @IsEnum(ActivityPriority)
  priority?: ActivityPriority;

  @ApiProperty({ description: 'Signed business-day offset. Cannot be 0.' })
  @IsInt()
  @NotEquals(0, { message: 'businessDayOffset cannot be 0' })
  businessDayOffset: number;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime must be in "HH:mm" format' })
  dueTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [Number], description: 'IDs of predecessor templates.' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  dependsOnTemplateIds?: number[];
}
