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

  /**
   * `NO ACTION`, not `CASCADE` like `template` above — SQL Server rejects two cascading foreign
   * keys from the same child table to the same parent table ("may cause cycles or multiple
   * cascade paths", error 1785). Harmless in practice: there's no `DELETE /activity-templates/:id`
   * endpoint, so this path is never actually exercised.
   */
  @ManyToOne(() => ActivityTemplate, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'dependsOnTemplateId' })
  dependsOnTemplate: ActivityTemplate;
}
