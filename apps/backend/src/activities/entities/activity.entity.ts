import { ActivityPriority, ActivityStatus } from '@workflow-brasal/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { ActivityTemplate } from '../../activity-templates/entities/activity-template.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', nullable: true })
  responsibleId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsibleId' })
  responsible: User | null;

  /** Stands in for `responsible` when they're on vacation or overloaded. */
  @Column({ type: 'int', nullable: true })
  coResponsibleId: number | null;

  /**
   * `NO ACTION`, not `SET NULL` like `responsible` above — SQL Server rejects two cascading
   * (SET NULL/CASCADE) foreign keys from the same child table to the same parent table
   * ("may cause cycles or multiple cascade paths", error 1785). Harmless in practice: there's no
   * `DELETE /users/:id` endpoint (deactivation is soft via `isActive`, see soft-delete-default
   * convention), so this path is never actually exercised.
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'coResponsibleId' })
  coResponsible: User | null;

  @Column({ type: 'varchar', default: ActivityPriority.MEDIUM })
  priority: ActivityPriority;

  @Column({ type: 'varchar', default: ActivityStatus.TO_DO })
  status: ActivityStatus;

  @Column({ type: 'datetime', nullable: true })
  startDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  deadline: Date | null;

  /** Business-day offset that produced `deadline`. null means the deadline was set manually. */
  @Column({ type: 'int', nullable: true })
  businessDayOffset: number | null;

  /**
   * Reference month/year used to resolve `businessDayOffset` into `deadline`.
   * Also doubles as the idempotency key for monthly closure generation — a manual deadline PATCH
   * must preserve these two fields (only businessDayOffset is cleared).
   */
  @Column({ type: 'int', nullable: true })
  dueDateRuleMonth: number | null;

  @Column({ type: 'int', nullable: true })
  dueDateRuleYear: number | null;

  /** "HH:mm" applied to the time component of `deadline` at calculation time. */
  @Column({ type: 'varchar', nullable: true })
  dueTime: string | null;

  @Column({ type: 'int', nullable: true })
  templateId: number | null;

  @ManyToOne(() => ActivityTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template: ActivityTemplate | null;

  @Column({ type: 'datetime', nullable: true })
  completionDate: Date | null;

  @Column({ type: 'int', default: 0 })
  progressPercent: number;

  @Column({ type: 'float', nullable: true })
  estimatedHours: number | null;

  @Column({ type: 'float', nullable: true })
  actualHours: number | null;

  /** Always computed by the service layer — never settable directly through the API. */
  @Column({ type: 'float', default: 0 })
  exceededHours: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Used by the Dashboard's "Lead time médio" metric (completionDate - createdAt). */
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
