import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { ActivityDependency } from '../activities/entities/activity-dependency.entity';
import { ActivityHistory } from '../activities/entities/activity-history.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityTemplatesModule } from '../activity-templates/activity-templates.module';
import { NotificationLog } from '../notifications/entities/notification-log.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ClosureController } from './closure.controller';
import { ClosureService } from './closure.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityDependency, ActivityHistory, NotificationLog]),
    ProjectsModule,
    ActivityTemplatesModule,
    ActivitiesModule,
  ],
  controllers: [ClosureController],
  providers: [ClosureService],
  exports: [ClosureService],
})
export class ClosureModule {}
