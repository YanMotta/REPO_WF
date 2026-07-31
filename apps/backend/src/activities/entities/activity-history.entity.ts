import { ActivityHistoryEventType } from '@workflow-brasal/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activity } from './activity.entity';
import { User } from '../../users/entities/user.entity';

@Entity('activity_history')
export class ActivityHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  activityId: number;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @Column({ type: 'varchar' })
  eventType: ActivityHistoryEventType;

  @Column({ type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ type: 'text', nullable: true })
  newValue: string | null;

  /** Null for system-triggered events (e.g. BECAME_LATE) that have no acting user. */
  @Column({ type: 'int', nullable: true })
  changedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedById' })
  changedBy: User | null;

  @CreateDateColumn({ type: 'datetime' })
  occurredAt: Date;
}
