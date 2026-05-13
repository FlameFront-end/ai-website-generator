import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RunArtifactEntity } from './run-artifact.entity';
import { RunLogEntity } from './run-log.entity';
import { RunStatus } from './run-status.enum';
import { UserEntity } from './user.entity';

@Entity({ name: 'runs' })
export class RunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer', unique: true })
  runNumber!: number;

  @Column({ type: 'varchar', length: 32, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  displayName!: string | null;

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean;

  @Column({ type: 'text' })
  brief!: string;

  @Column({ type: 'enum', enum: RunStatus, default: RunStatus.Queued })
  status!: RunStatus;

  @Column({ type: 'varchar', length: 160, nullable: true })
  currentStep!: string | null;

  @Column({ type: 'integer', nullable: true })
  score!: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.runs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @OneToMany(() => RunArtifactEntity, (artifact) => artifact.run, {
    cascade: true,
  })
  artifacts!: RunArtifactEntity[];

  @OneToMany(() => RunLogEntity, (log) => log.run, { cascade: true })
  logs!: RunLogEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
