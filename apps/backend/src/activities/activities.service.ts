import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ActivityHistoryEventType,
  ActivityStatus,
  parseLocalDateOnly,
  resolveBusinessDayOffset,
} from '@workflow-brasal/shared';
import { Between, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import {
  ActivityAssigneeChangedPayload,
  ActivityBecameLatePayload,
  ActivityCompletedPayload,
  DependencyReleasedPayload,
  DomainEvent,
} from '../common/events/domain-events';
import { wouldCreateCycle } from '../common/graph/cycle-detection';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ChangeCoResponsibleDto } from './dto/change-co-responsible.dto';
import { ChangeResponsibleDto } from './dto/change-responsible.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { UpdateActivityProgressDto } from './dto/update-activity-progress.dto';
import { assertManualStatusTransition } from './activities.rules';
import { ActivityDependency } from './entities/activity-dependency.entity';
import { ActivityHistory } from './entities/activity-history.entity';
import { Activity } from './entities/activity.entity';

/** Applies "HH:mm" to the local time component of `date`. */
function applyDueTime(date: Date, dueTime: string | null | undefined): Date {
  if (!dueTime) return date;
  const [hours, minutes] = dueTime.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a deadline input that may be either a date-only string ("YYYY-MM-DD" — from
 * resolveBusinessDayOffset, or a client sending just a date) or a full ISO datetime.
 * Date-only strings must be parsed as LOCAL midnight, not UTC — `new Date("2026-07-03")` parses as
 * UTC midnight, which is the previous calendar day in any timezone behind UTC (e.g.
 * America/Sao_Paulo). Full ISO datetimes already encode an unambiguous instant and parse as-is.
 */
function parseDeadlineInput(value: string): Date {
  return DATE_ONLY_PATTERN.test(value) ? parseLocalDateOnly(value) : new Date(value);
}

function hoursBetween(earlier: Date, later: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60);
}

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(ActivityDependency)
    private readonly dependenciesRepository: Repository<ActivityDependency>,
    @InjectRepository(ActivityHistory)
    private readonly historyRepository: Repository<ActivityHistory>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** BACKLOG if the activity is created with open dependencies, TO_DO otherwise. */
  static resolveInitialStatus(hasDependencies: boolean): ActivityStatus {
    return hasDependencies ? ActivityStatus.BACKLOG : ActivityStatus.TO_DO;
  }

  private recordHistory(
    activityId: number,
    eventType: ActivityHistoryEventType,
    oldValue: string | null,
    newValue: string | null,
    changedById: number | null,
  ): Promise<ActivityHistory> {
    const entry = this.historyRepository.create({
      activityId,
      eventType,
      oldValue,
      newValue,
      changedById,
    });
    return this.historyRepository.save(entry);
  }

  async create(dto: CreateActivityDto, actorId: number | null = null): Promise<Activity> {
    let deadline: Date | null = null;
    let businessDayOffset: number | null = null;
    let dueDateRuleMonth: number | null = null;
    let dueDateRuleYear: number | null = null;

    if (dto.businessDayOffset != null && dto.dueDateRuleMonth != null && dto.dueDateRuleYear != null) {
      const resolved = resolveBusinessDayOffset(
        dto.businessDayOffset,
        dto.dueDateRuleYear,
        dto.dueDateRuleMonth,
      );
      if (!resolved) {
        throw new BadRequestException(
          `businessDayOffset ${dto.businessDayOffset} is not resolvable for ${dto.dueDateRuleYear}-${dto.dueDateRuleMonth}`,
        );
      }
      deadline = applyDueTime(parseDeadlineInput(resolved), dto.dueTime);
      businessDayOffset = dto.businessDayOffset;
      dueDateRuleMonth = dto.dueDateRuleMonth;
      dueDateRuleYear = dto.dueDateRuleYear;
    } else if (dto.deadline) {
      deadline = applyDueTime(parseDeadlineInput(dto.deadline), dto.dueTime);
    }

    const hasDependencies = !!dto.dependsOnActivityIds?.length;

    const activity = this.activitiesRepository.create({
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      responsibleId: dto.responsibleId ?? null,
      coResponsibleId: dto.coResponsibleId ?? null,
      priority: dto.priority ?? undefined,
      status: ActivitiesService.resolveInitialStatus(hasDependencies),
      startDate: dto.startDate ? parseDeadlineInput(dto.startDate) : null,
      deadline,
      businessDayOffset,
      dueDateRuleMonth,
      dueDateRuleYear,
      dueTime: dto.dueTime ?? null,
      templateId: dto.templateId ?? null,
      estimatedHours: dto.estimatedHours ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.activitiesRepository.save(activity);

    if (dto.dependsOnActivityIds?.length) {
      await this.dependenciesRepository.save(
        dto.dependsOnActivityIds.map((dependsOnActivityId) =>
          this.dependenciesRepository.create({ activityId: saved.id, dependsOnActivityId }),
        ),
      );
    }

    await this.recordHistory(saved.id, ActivityHistoryEventType.CREATED, null, saved.status, actorId);
    return saved;
  }

  async findAll(filter: ActivityFilterDto): Promise<Activity[]> {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.responsibleId) where.responsibleId = filter.responsibleId;
    if (filter.month != null && filter.year != null) {
      // Local boundaries — deadlines are anchored to local calendar days (see parseDeadlineInput).
      const start = new Date(filter.year, filter.month - 1, 1, 0, 0, 0, 0);
      const end = new Date(filter.year, filter.month, 0, 23, 59, 59, 999);
      where.deadline = Between(start, end);
    }
    return this.activitiesRepository.find({ where, order: { deadline: 'ASC' } });
  }

  async findById(id: number): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({ where: { id } });
    if (!activity) throw new NotFoundException(`Activity ${id} not found`);
    return activity;
  }

  /** Plain field updates. Manual `deadline` overrides a business-day rule but preserves the
   * dueDateRuleMonth/Year idempotency key — see UpdateActivityDto's doc comment. */
  async update(id: number, dto: UpdateActivityDto): Promise<Activity> {
    const activity = await this.findById(id);

    if (dto.title !== undefined) activity.title = dto.title;
    if (dto.description !== undefined) activity.description = dto.description;
    if (dto.priority !== undefined) activity.priority = dto.priority;
    if (dto.startDate !== undefined) activity.startDate = parseDeadlineInput(dto.startDate);
    if (dto.estimatedHours !== undefined) activity.estimatedHours = dto.estimatedHours;
    if (dto.actualHours !== undefined) activity.actualHours = dto.actualHours;
    if (dto.progressPercent !== undefined) activity.progressPercent = dto.progressPercent;
    if (dto.notes !== undefined) activity.notes = dto.notes;

    if (dto.deadline !== undefined) {
      activity.deadline = applyDueTime(parseDeadlineInput(dto.deadline), activity.dueTime);
      activity.businessDayOffset = null;
      // dueDateRuleMonth/dueDateRuleYear intentionally left untouched.
    }

    return this.activitiesRepository.save(activity);
  }

  /**
   * Manual status change endpoint. `assertManualStatusTransition` enforces that READY_TO_START
   * and LATE are system-only (as a direct request), and that IN_PROGRESS requires all
   * dependencies resolved.
   * On a DONE request, `exceededHours` is unconditionally recomputed — never guarded by an
   * `if (late)` check — so a previously-late activity whose deadline was later corrected reports
   * 0, not a stale value from an earlier completion attempt. If completing lands after the
   * deadline (exceededHours > 0), the activity is finished — completionDate/exceededHours record
   * that — but its final status becomes LATE instead of DONE, per business rule: a task done past
   * its deadline is "atrasada", not "concluída". completionDate is what actually marks it as
   * finished from here on (see getBlockedBy/findAllLate), not the DONE label specifically.
   */
  async changeStatus(
    id: number,
    dto: ChangeStatusDto,
    actorId: number | null = null,
  ): Promise<Activity> {
    const activity = await this.findById(id);
    const blockedByCount = (await this.getBlockedBy(id)).length;
    assertManualStatusTransition(activity.status, dto.status, blockedByCount);

    const oldStatus = activity.status;
    const isCompleting = dto.status === ActivityStatus.DONE;

    if (isCompleting) {
      activity.completionDate = new Date();
      activity.exceededHours = activity.deadline
        ? Math.max(0, hoursBetween(activity.deadline, activity.completionDate))
        : 0;
    }

    const finalStatus = isCompleting && activity.exceededHours > 0 ? ActivityStatus.LATE : dto.status;
    activity.status = finalStatus;

    const saved = await this.activitiesRepository.save(activity);

    await this.recordHistory(
      saved.id,
      ActivityHistoryEventType.STATUS_CHANGED,
      oldStatus,
      finalStatus,
      actorId,
    );

    if (isCompleting) {
      await this.recordHistory(saved.id, ActivityHistoryEventType.COMPLETED, oldStatus, finalStatus, actorId);
      const payload: ActivityCompletedPayload = { activityId: saved.id };
      this.eventEmitter.emit(DomainEvent.ActivityCompleted, payload);
    }

    return saved;
  }

  /** The subset of fields the responsible/co-responsible themselves may update — reporting actual
   * progress, hours worked and notes, without touching title/priority/deadline (admin-only, see
   * `update` above). Records one history entry per call, capturing the progress percent
   * before/after even if this particular call only changed hours or notes. */
  async updateProgress(
    id: number,
    dto: UpdateActivityProgressDto,
    actorId: number | null = null,
  ): Promise<Activity> {
    const activity = await this.findById(id);
    const oldProgress = activity.progressPercent;

    if (dto.progressPercent !== undefined) activity.progressPercent = dto.progressPercent;
    if (dto.actualHours !== undefined) activity.actualHours = dto.actualHours;
    if (dto.notes !== undefined) activity.notes = dto.notes;

    const saved = await this.activitiesRepository.save(activity);

    await this.recordHistory(
      saved.id,
      ActivityHistoryEventType.PROGRESS_UPDATED,
      String(oldProgress),
      String(saved.progressPercent),
      actorId,
    );

    return saved;
  }

  async changeResponsible(
    id: number,
    dto: ChangeResponsibleDto,
    actorId: number | null = null,
  ): Promise<Activity> {
    const activity = await this.findById(id);
    const oldResponsibleId = activity.responsibleId;
    activity.responsibleId = dto.responsibleId;
    const saved = await this.activitiesRepository.save(activity);

    await this.recordHistory(
      saved.id,
      ActivityHistoryEventType.ASSIGNEE_CHANGED,
      oldResponsibleId != null ? String(oldResponsibleId) : null,
      String(dto.responsibleId),
      actorId,
    );

    const payload: ActivityAssigneeChangedPayload = {
      activityId: saved.id,
      oldResponsibleId,
      newResponsibleId: dto.responsibleId,
    };
    this.eventEmitter.emit(DomainEvent.ActivityAssigneeChanged, payload);

    return saved;
  }

  /** Sets/clears the co-responsible — a stand-in who can pick up the activity if the primary
   * responsible is on vacation or overloaded. `coResponsibleId: null` clears it. */
  async changeCoResponsible(
    id: number,
    dto: ChangeCoResponsibleDto,
    actorId: number | null = null,
  ): Promise<Activity> {
    const activity = await this.findById(id);
    const oldCoResponsibleId = activity.coResponsibleId;
    activity.coResponsibleId = dto.coResponsibleId;
    const saved = await this.activitiesRepository.save(activity);

    await this.recordHistory(
      saved.id,
      ActivityHistoryEventType.CO_RESPONSIBLE_CHANGED,
      oldCoResponsibleId != null ? String(oldCoResponsibleId) : null,
      dto.coResponsibleId != null ? String(dto.coResponsibleId) : null,
      actorId,
    );

    return saved;
  }

  async getDependencies(activityId: number): Promise<ActivityDependency[]> {
    return this.dependenciesRepository.find({ where: { activityId } });
  }

  /** All dependency edges, unfiltered — backs the Gantt view's bulk connector rendering. */
  findAllDependencies(): Promise<ActivityDependency[]> {
    return this.dependenciesRepository.find();
  }

  /** Predecessor activities not yet finished — used to gate manual transition to IN_PROGRESS.
   * "Finished" means completionDate is set, not status === DONE specifically — a predecessor
   * completed after its deadline ends up status LATE, not DONE, but it's still done and must not
   * keep blocking its dependents. */
  async getBlockedBy(activityId: number): Promise<Activity[]> {
    const deps = await this.getDependencies(activityId);
    if (!deps.length) return [];
    const predecessors = await this.activitiesRepository.find({
      where: { id: In(deps.map((d) => d.dependsOnActivityId)) },
    });
    return predecessors.filter((p) => p.completionDate == null);
  }

  /** Adding a dependency to a TO_DO activity rebases it to BACKLOG — same rule as at creation time.
   * Rejects an activityId -> dependsOnActivityId edge when dependsOnActivityId already (directly
   * or transitively) depends on activityId — adding it would close a cycle that leaves every
   * activity in the loop permanently stuck in Backlog, since none could ever resolve all its
   * predecessors. */
  async addDependency(activityId: number, dependsOnActivityId: number): Promise<ActivityDependency> {
    if (activityId === dependsOnActivityId) {
      throw new BadRequestException('An activity cannot depend on itself');
    }
    const activity = await this.findById(activityId);
    await this.findById(dependsOnActivityId);

    const isCycle = await wouldCreateCycle(dependsOnActivityId, activityId, async (id) =>
      (await this.getDependencies(id)).map((d) => d.dependsOnActivityId),
    );
    if (isCycle) {
      throw new BadRequestException(
        `Adding this dependency would create a cycle: activity ${dependsOnActivityId} already depends ` +
          `(directly or transitively) on activity ${activityId}`,
      );
    }

    const existing = await this.dependenciesRepository.findOne({
      where: { activityId, dependsOnActivityId },
    });
    const dependency =
      existing ??
      (await this.dependenciesRepository.save(
        this.dependenciesRepository.create({ activityId, dependsOnActivityId }),
      ));

    if (activity.status === ActivityStatus.TO_DO) {
      const oldStatus = activity.status;
      activity.status = ActivityStatus.BACKLOG;
      await this.activitiesRepository.save(activity);
      await this.recordHistory(
        activityId,
        ActivityHistoryEventType.STATUS_CHANGED,
        oldStatus,
        ActivityStatus.BACKLOG,
        null,
      );
    }

    return dependency;
  }

  async removeDependency(activityId: number, dependsOnActivityId: number): Promise<void> {
    await this.dependenciesRepository.delete({ activityId, dependsOnActivityId });
  }

  /** Activities that declare `activityId` as a dependency (used by the promotion listener). */
  async findDependents(activityId: number): Promise<ActivityDependency[]> {
    return this.dependenciesRepository.find({ where: { dependsOnActivityId: activityId } });
  }

  /**
   * Promotes a BACKLOG activity to READY_TO_START once every one of its dependencies is DONE.
   * Called by the dependency-resolution listener for each dependent of a just-completed activity.
   * No-op if the activity isn't BACKLOG or still has unresolved dependencies.
   */
  async promoteIfDependenciesResolved(activityId: number): Promise<void> {
    const activity = await this.findById(activityId);
    if (activity.status !== ActivityStatus.BACKLOG) return;

    const blockedBy = await this.getBlockedBy(activityId);
    if (blockedBy.length > 0) return;

    const oldStatus = activity.status;
    activity.status = ActivityStatus.READY_TO_START;
    await this.activitiesRepository.save(activity);

    await this.recordHistory(
      activityId,
      ActivityHistoryEventType.DEPENDENCY_RESOLVED,
      oldStatus,
      ActivityStatus.READY_TO_START,
      null,
    );

    const payload: DependencyReleasedPayload = { activityId };
    this.eventEmitter.emit(DomainEvent.DependencyReleased, payload);
  }

  async save(activity: Activity): Promise<Activity> {
    return this.activitiesRepository.save(activity);
  }

  /** Overdue and not already in a terminal/late state — candidates for LateJob. */
  findOverdueNotLate(now: Date): Promise<Activity[]> {
    return this.activitiesRepository.find({
      where: {
        deadline: LessThan(now),
        status: Not(In([ActivityStatus.DONE, ActivityStatus.LATE])),
      },
    });
  }

  /** Only still-open LATE activities — excludes ones completed after their deadline
   * (completionDate set), whose exceededHours must stay frozen at the value recorded at
   * completion, not keep growing with the current time. */
  findAllLate(): Promise<Activity[]> {
    return this.activitiesRepository.find({
      where: { status: ActivityStatus.LATE, completionDate: IsNull() },
    });
  }

  /** Not yet late/done, with a deadline landing inside [now, windowEnd] — candidates for the
   * approaching-deadline notification. Dedup ("once per activity") is enforced by the listener
   * checking NotificationLog, not here. */
  findApproachingDeadline(now: Date, windowEnd: Date): Promise<Activity[]> {
    return this.activitiesRepository.find({
      where: {
        deadline: Between(now, windowEnd),
        status: Not(In([ActivityStatus.DONE, ActivityStatus.LATE])),
      },
    });
  }

  /** Transitions an overdue activity to LATE. No-op if it's already DONE/LATE (race-safe recheck). */
  async markLate(activityId: number): Promise<void> {
    const activity = await this.findById(activityId);
    if (activity.status === ActivityStatus.DONE || activity.status === ActivityStatus.LATE) return;

    const oldStatus = activity.status;
    activity.status = ActivityStatus.LATE;
    await this.activitiesRepository.save(activity);

    await this.recordHistory(
      activityId,
      ActivityHistoryEventType.BECAME_LATE,
      oldStatus,
      ActivityStatus.LATE,
      null,
    );

    const payload: ActivityBecameLatePayload = { activityId };
    this.eventEmitter.emit(DomainEvent.ActivityBecameLate, payload);
  }

  /** Keeps a LATE activity's exceededHours "live" until it's completed (see changeStatus's DONE branch). */
  async recomputeExceededHoursLive(activityId: number): Promise<void> {
    const activity = await this.findById(activityId);
    if (!activity.deadline) return;
    activity.exceededHours = Math.max(0, hoursBetween(activity.deadline, new Date()));
    await this.activitiesRepository.save(activity);
  }
}
