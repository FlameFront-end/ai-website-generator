import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ArtifactType } from './artifact-type.enum';
import { RunEntity } from './run.entity';

@Entity({ name: 'run_artifacts' })
export class RunArtifactEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  runId!: string;

  @ManyToOne(() => RunEntity, (run) => run.artifacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runId' })
  run!: RunEntity;

  @Column({ type: 'enum', enum: ArtifactType })
  type!: ArtifactType;

  @Column({ type: 'text' })
  path!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mimeType!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
