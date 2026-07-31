import { Role } from '@workflow-brasal/shared';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: Role.MEMBER })
  role: Role;

  @Column({ default: true })
  isActive: boolean;
}
