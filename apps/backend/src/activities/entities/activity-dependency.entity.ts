import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Activity } from './activity.entity';

/**
 * Explicit join entity for the self-referential Activity <-> Activity dependency relation
 * (modeled explicitly instead of an implicit @ManyToMany so both directions — "what blocks me" and
 * "what do I unblock" — can be queried directly).
 */
@Entity('activity_dependencies')
@Unique(['activityId', 'dependsOnActivityId'])
export class ActivityDependency {
  @PrimaryGeneratedColumn()
  id: number;

  /** The dependent activity. */
  @Column()
  activityId: number;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  /** The predecessor activity that must complete first. */
  @Column()
  dependsOnActivityId: number;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dependsOnActivityId' })
  dependsOnActivity: Activity;
}
