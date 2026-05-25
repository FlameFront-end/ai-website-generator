import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RunLogEntity, RunLogLevel } from '../../db/entities';

@Injectable()
export class RunLogService {
  constructor(
    @InjectRepository(RunLogEntity)
    private readonly logsRepository: Repository<RunLogEntity>,
  ) {}

  async addLog(
    runId: string,
    message: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.logsRepository.save({
      runId,
      level: RunLogLevel.Info,
      message,
      metadata,
    });
  }

  async addWarning(
    runId: string,
    message: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.logsRepository.save({
      runId,
      level: RunLogLevel.Warning,
      message,
      metadata,
    });
  }

  async addError(
    runId: string,
    message: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.logsRepository.save({
      runId,
      level: RunLogLevel.Error,
      message,
      metadata,
    });
  }

  async getLogs(
    runId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: RunLogEntity[]; total: number }> {
    const [items, total] = await this.logsRepository.findAndCount({
      where: { runId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }
}
