import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityDependency } from './entities/activity-dependency.entity';
import { ActivityHistory } from './entities/activity-history.entity';
import { Activity } from './entities/activity.entity';
import { ApproachingDeadlineJob } from './jobs/approaching-deadline.job';
import { LateJob } from './jobs/late.job';
import { DependencyResolutionListener } from './listeners/dependency-resolution.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, ActivityDependency, ActivityHistory])],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, DependencyResolutionListener, LateJob, ApproachingDeadlineJob],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
