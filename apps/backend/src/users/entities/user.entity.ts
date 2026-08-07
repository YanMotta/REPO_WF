import { Role } from '@workflow-brasal/shared';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

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

  /** New self-registrations start false; pre-existing rows must be backfilled to true when this
   * column is added in the production (mssql) migration, or every existing account gets locked
   * out of login the moment the migration runs. */
  @Column({ default: false })
  isVerified: boolean;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  verificationToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  verificationTokenExpiresAt: Date | null;
}
