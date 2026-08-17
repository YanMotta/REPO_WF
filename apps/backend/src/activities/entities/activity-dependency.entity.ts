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

  /**
   * `NO ACTION`, not `CASCADE` like `activity` above — SQL Server rejects two cascading foreign
   * keys from the same child table to the same parent table ("may cause cycles or multiple
   * cascade paths", error 1785). Harmless in practice: there's no `DELETE /activities/:id`
   * endpoint, so this path is never actually exercised.
   */
  @ManyToOne(() => Activity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'dependsOnActivityId' })
  dependsOnActivity: Activity;
}
