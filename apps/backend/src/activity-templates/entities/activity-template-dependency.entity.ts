import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ActivityTemplate } from './activity-template.entity';

/**
 * Explicit join entity for predecessor relations between templates — replicated as real
 * ActivityDependency rows between the Activities generated for a given month (see ClosureService).
 */
@Entity('activity_template_dependencies')
@Unique(['templateId', 'dependsOnTemplateId'])
export class ActivityTemplateDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  templateId: number;

  @ManyToOne(() => ActivityTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: ActivityTemplate;

  @Column()
  dependsOnTemplateId: number;

  @ManyToOne(() => ActivityTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dependsOnTemplateId' })
  dependsOnTemplate: ActivityTemplate;
}
