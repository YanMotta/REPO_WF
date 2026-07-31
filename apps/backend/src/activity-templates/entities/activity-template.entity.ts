import { ActivityPriority } from '@workflow-brasal/shared';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * The recurring "recipe" for the monthly closure checklist — has no month/year of its own.
 * ClosureService.generateForMonth turns each active template into a real Activity every month.
 */
@Entity('activity_templates')
export class ActivityTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', nullable: true })
  responsibleId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsibleId' })
  responsible: User | null;

  @Column({ type: 'varchar', default: ActivityPriority.MEDIUM })
  priority: ActivityPriority;

  /** Signed business-day offset (see packages/shared business-days.ts). Required, cannot be 0. */
  @Column({ type: 'int' })
  businessDayOffset: number;

  @Column({ type: 'varchar', nullable: true })
  dueTime: string | null;

  @Column({ type: 'float', nullable: true })
  estimatedHours: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: true })
  isActive: boolean;
}
