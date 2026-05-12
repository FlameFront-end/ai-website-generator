import { promisify } from 'node:util';
import { exec } from 'node:child_process';

import type { ExecOptions, ExecResult } from '../types/exec.types';

const execAsync = promisify(exec);

/**
 * Утилита для выполнения команд
 */
export class ExecUtil {
  /**
   * Выполнить команду
   */
  static async execute(
    command: string,
    options: ExecOptions,
  ): Promise<ExecResult> {
    try {
      const { stdout, stderr } = await execAsync(command, options);
      return {
        stdout: stdout || '',
        stderr: stderr || '',
      };
    } catch (error: unknown) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      };
    }
  }
}
