import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { ActivityPriority, ActivityStatus } from '@workflow-brasal/shared';
import { Repository } from 'typeorm';
import { allEntities } from '../database/entities';
import { Project } from '../projects/entities/project.entity';
import { ActivitiesService } from './activities.service';
import { ActivityDependency } from './entities/activity-dependency.entity';
import { Activity } from './entities/activity.entity';

/**
 * Runs against a real (in-memory, sqljs) database rather than mocked repositories — the
 * behaviors under test here (getBlockedBy's completionDate-based predicate, the late-completion
 * status rule, cycle rejection) are exactly the ones that already broke silently once this
 * session, in ways that only showed up when the actual TypeORM queries ran. Hand-mocked
 * repositories would just re-encode the same assumption being tested and prove nothing.
 */
describe('ActivitiesService', () => {
  let module: TestingModule;
  let service: ActivitiesService;
  let activitiesRepo: Repository<Activity>;
  let dependenciesRepo: Repository<ActivityDependency>;
  let projectId: number;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'sqljs',
          autoSave: false,
          entities: allEntities,
          synchronize: true,
        }),
        TypeOrmModule.forFeature(allEntities),
      ],
      providers: [ActivitiesService],
    }).compile();

    service = module.get(ActivitiesService);
    activitiesRepo = module.get(getRepositoryToken(Activity));
    dependenciesRepo = module.get(getRepositoryToken(ActivityDependency));

    const projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    const project = await projectRepo.save(projectRepo.create({ name: 'Fechamento Mensal' }));
    projectId = project.id;
  });

  afterEach(async () => {
    await module.close();
  });

  function makeActivity(overrides: Partial<Activity> = {}): Promise<Activity> {
    return activitiesRepo.save(
      activitiesRepo.create({
        projectId,
        title: 'Test activity',
        priority: ActivityPriority.MEDIUM,
        status: ActivityStatus.TO_DO,
        ...overrides,
      }),
    );
  }

  function linkDependency(activityId: number, dependsOnActivityId: number): Promise<ActivityDependency> {
    return dependenciesRepo.save(dependenciesRepo.create({ activityId, dependsOnActivityId }));
  }

  describe('changeStatus — late-completion rule', () => {
    it('marks status DONE with exceededHours 0 when completed before the deadline', async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const activity = await makeActivity({ status: ActivityStatus.IN_PROGRESS, deadline: future });

      const result = await service.changeStatus(activity.id, { status: ActivityStatus.DONE });

      expect(result.status).toBe(ActivityStatus.DONE);
      expect(result.exceededHours).toBe(0);
      expect(result.completionDate).not.toBeNull();
    });

    it('marks status LATE, not DONE, when completed after the deadline', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activity = await makeActivity({ status: ActivityStatus.IN_PROGRESS, deadline: past });

      const result = await service.changeStatus(activity.id, { status: ActivityStatus.DONE });

      expect(result.status).toBe(ActivityStatus.LATE);
      expect(result.exceededHours).toBeGreaterThan(0);
      expect(result.completionDate).not.toBeNull();
    });

    it('has no exceeded hours when completed with no deadline set at all', async () => {
      const activity = await makeActivity({ status: ActivityStatus.IN_PROGRESS, deadline: null });

      const result = await service.changeStatus(activity.id, { status: ActivityStatus.DONE });

      expect(result.status).toBe(ActivityStatus.DONE);
      expect(result.exceededHours).toBe(0);
    });

    it('rejects manually setting a system-only status like READY_TO_START', async () => {
      const activity = await makeActivity({ status: ActivityStatus.BACKLOG });

      await expect(
        service.changeStatus(activity.id, { status: ActivityStatus.READY_TO_START }),
      ).rejects.toThrow();
    });
  });

  describe('getBlockedBy — completionDate, not status === DONE, marks a predecessor finished', () => {
    it('returns empty when the activity has no dependencies', async () => {
      const activity = await makeActivity();
      expect(await service.getBlockedBy(activity.id)).toEqual([]);
    });

    it('blocks on a predecessor that has not completed', async () => {
      const predecessor = await makeActivity({ status: ActivityStatus.TO_DO });
      const dependent = await makeActivity({ status: ActivityStatus.BACKLOG });
      await linkDependency(dependent.id, predecessor.id);

      const blocked = await service.getBlockedBy(dependent.id);
      expect(blocked.map((a) => a.id)).toEqual([predecessor.id]);
    });

    it('does NOT block on a predecessor that completed late (status LATE, completionDate set)', async () => {
      const predecessor = await makeActivity({ status: ActivityStatus.LATE, completionDate: new Date() });
      const dependent = await makeActivity({ status: ActivityStatus.BACKLOG });
      await linkDependency(dependent.id, predecessor.id);

      expect(await service.getBlockedBy(dependent.id)).toEqual([]);
    });
  });

  describe('promoteIfDependenciesResolved', () => {
    it('promotes a BACKLOG activity to READY_TO_START once its dependency is done', async () => {
      const predecessor = await makeActivity({ status: ActivityStatus.DONE, completionDate: new Date() });
      const dependent = await makeActivity({ status: ActivityStatus.BACKLOG });
      await linkDependency(dependent.id, predecessor.id);

      await service.promoteIfDependenciesResolved(dependent.id);

      expect((await service.findById(dependent.id)).status).toBe(ActivityStatus.READY_TO_START);
    });

    it('leaves a BACKLOG activity alone while a dependency is still open', async () => {
      const predecessor = await makeActivity({ status: ActivityStatus.TO_DO });
      const dependent = await makeActivity({ status: ActivityStatus.BACKLOG });
      await linkDependency(dependent.id, predecessor.id);

      await service.promoteIfDependenciesResolved(dependent.id);

      expect((await service.findById(dependent.id)).status).toBe(ActivityStatus.BACKLOG);
    });

    it('is a no-op for an activity that is not BACKLOG', async () => {
      const activity = await makeActivity({ status: ActivityStatus.TO_DO });

      await service.promoteIfDependenciesResolved(activity.id);

      expect((await service.findById(activity.id)).status).toBe(ActivityStatus.TO_DO);
    });
  });

  describe('addDependency — cycle rejection wiring', () => {
    it('allows a valid new dependency that does not create a cycle', async () => {
      const a = await makeActivity();
      const b = await makeActivity();

      await expect(service.addDependency(a.id, b.id)).resolves.toBeDefined();
    });

    it('rejects a new dependency that would close a cycle across three activities', async () => {
      const a = await makeActivity();
      const b = await makeActivity();
      const c = await makeActivity();
      await service.addDependency(a.id, b.id); // a depends on b
      await service.addDependency(b.id, c.id); // b depends on c

      // c -> a would close the loop a -> b -> c -> a.
      await expect(service.addDependency(c.id, a.id)).rejects.toThrow();
    });
  });

  describe('findAllLate', () => {
    it('excludes an activity that completed after its deadline (frozen exceededHours)', async () => {
      await makeActivity({ status: ActivityStatus.LATE, completionDate: null });
      await makeActivity({ status: ActivityStatus.LATE, completionDate: new Date() });

      const stillLate = await service.findAllLate();

      expect(stillLate).toHaveLength(1);
      expect(stillLate[0].completionDate).toBeNull();
    });
  });
});
