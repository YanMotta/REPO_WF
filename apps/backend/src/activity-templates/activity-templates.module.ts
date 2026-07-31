import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTemplatesController } from './activity-templates.controller';
import { ActivityTemplatesService } from './activity-templates.service';
import { ActivityTemplateDependency } from './entities/activity-template-dependency.entity';
import { ActivityTemplate } from './entities/activity-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityTemplate, ActivityTemplateDependency])],
  controllers: [ActivityTemplatesController],
  providers: [ActivityTemplatesService],
  exports: [ActivityTemplatesService],
})
export class ActivityTemplatesModule {}
