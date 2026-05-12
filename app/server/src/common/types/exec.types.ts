/**
 * Типы для выполнения команд
 */

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export interface ExecOptions {
  cwd: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}
