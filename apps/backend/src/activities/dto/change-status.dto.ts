import { ApiProperty } from '@nestjs/swagger';
import { ActivityStatus } from '@workflow-brasal/shared';
import { IsEnum } from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty({ enum: ActivityStatus })
  @IsEnum(ActivityStatus)
  status: ActivityStatus;
}
