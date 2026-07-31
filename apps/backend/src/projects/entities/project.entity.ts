import { ProjectStatus } from '@workflow-brasal/shared';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Column({ type: 'int', nullable: true })
  ownerId: number | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;
}
