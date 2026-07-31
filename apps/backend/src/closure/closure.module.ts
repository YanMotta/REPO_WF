import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityTemplatesModule } from '../activity-templates/activity-templates.module';
import { ProjectsModule } from '../projects/projects.module';
import { ClosureController } from './closure.controller';
import { ClosureService } from './closure.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity]),
    ProjectsModule,
    ActivityTemplatesModule,
    ActivitiesModule,
  ],
  controllers: [ClosureController],
  providers: [ClosureService],
  exports: [ClosureService],
})
export class ClosureModule {}
