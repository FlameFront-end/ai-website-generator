import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { RunEntity } from './run.entity';

export enum RunLogLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

@Entity({ name: 'run_logs' })
export class RunLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  runId!: string;

  @ManyToOne(() => RunEntity, (run) => run.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runId' })
  run!: RunEntity;

  @Column({ type: 'enum', enum: RunLogLevel, default: RunLogLevel.Info })
  level!: RunLogLevel;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
