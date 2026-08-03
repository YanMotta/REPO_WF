import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ActivitiesService } from '../activities/activities.service';
import { ActivityDependency } from '../activities/entities/activity-dependency.entity';
import { ActivityHistory } from '../activities/entities/activity-history.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityTemplatesService } from '../activity-templates/activity-templates.service';
import { NotificationLog } from '../notifications/entities/notification-log.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ClosureService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly templatesService: ActivityTemplatesService,
    private readonly activitiesService: ActivitiesService,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(ActivityDependency)
    private readonly dependenciesRepository: Repository<ActivityDependency>,
    @InjectRepository(ActivityHistory)
    private readonly historyRepository: Repository<ActivityHistory>,
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
  ) {}

  /**
   * Generates (idempotently) the monthly closure checklist from active ActivityTemplates.
   * Called whenever the Atividades tab opens, or via POST /closure/generate.
   *
   * The past-month no-op guard runs first, before any template/activity read or write — reopening
   * an already-closed month must never recreate a whole checklist born already overdue, which
   * would fire a flood of late notifications (see spec section 9).
   */
  async generateForMonth(month?: number, year?: number): Promise<{ created: number }> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const targetMonth = month ?? currentMonth;
    const targetYear = year ?? currentYear;

    if (targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth)) {
      return { created: 0 };
    }

    const project = await this.projectsService.findOrCreateFechamentoMensal();
    const templates = await this.templatesService.findActive();

    let created = 0;

    // Phase 1: create any Activity missing for this (template, month, year) triple. Idempotency
    // key is (templateId, dueDateRuleMonth, dueDateRuleYear) — existing activities are reused.
    for (const template of templates) {
      const existing = await this.findGeneratedActivity(template.id, targetMonth, targetYear);
      if (existing) continue;

      await this.activitiesService.create({
        projectId: project.id,
        title: template.title,
        description: template.description ?? undefined,
        responsibleId: template.responsibleId ?? undefined,
        priority: template.priority,
        businessDayOffset: template.businessDayOffset,
        dueDateRuleMonth: targetMonth,
        dueDateRuleYear: targetYear,
        dueTime: template.dueTime ?? undefined,
        templateId: template.id,
        estimatedHours: template.estimatedHours ?? undefined,
        notes: template.notes ?? undefined,
      });
      created++;
    }

    // Phase 2: replicate template predecessor links as real ActivityDependency rows between this
    // month's activities. Runs every call — self-healing even for months generated before, so a
    // predecessor added to a template after the first generation still gets backfilled.
    for (const template of templates) {
      const templateDependencies = await this.templatesService.getDependencies(template.id);
      if (!templateDependencies.length) continue;

      const activity = await this.findGeneratedActivity(template.id, targetMonth, targetYear);
      if (!activity) continue;

      for (const templateDependency of templateDependencies) {
        const predecessorActivity = await this.findGeneratedActivity(
          templateDependency.dependsOnTemplateId,
          targetMonth,
          targetYear,
        );
        if (!predecessorActivity) continue;
        await this.activitiesService.addDependency(activity.id, predecessorActivity.id);
      }
    }

    return { created };
  }

  /**
   * Deletes every Activity generated for (month, year), plus every row elsewhere that references
   * one of them. The ActivityDependency/ActivityHistory FKs declare ON DELETE CASCADE, but the
   * dev sqljs driver doesn't actually enforce FK constraints at runtime (verified: PRAGMA
   * foreign_keys reads back 0), so cascade never fires there — clean up explicitly instead of
   * relying on it, which also works unconditionally against the mssql prod driver.
   */
  async deleteForMonth(month: number, year: number): Promise<{ deleted: number }> {
    const activities = await this.activitiesRepository.find({
      where: { dueDateRuleMonth: month, dueDateRuleYear: year },
    });
    if (!activities.length) return { deleted: 0 };

    const ids = activities.map((a) => a.id);
    await this.dependenciesRepository.delete({ activityId: In(ids) });
    await this.dependenciesRepository.delete({ dependsOnActivityId: In(ids) });
    await this.historyRepository.delete({ activityId: In(ids) });
    await this.notificationLogRepository.delete({ activityId: In(ids) });
    await this.activitiesRepository.delete({ dueDateRuleMonth: month, dueDateRuleYear: year });

    return { deleted: activities.length };
  }

  private findGeneratedActivity(
    templateId: number,
    month: number,
    year: number,
  ): Promise<Activity | null> {
    return this.activitiesRepository.findOne({
      where: { templateId, dueDateRuleMonth: month, dueDateRuleYear: year },
    });
  }
}
