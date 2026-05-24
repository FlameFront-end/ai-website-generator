import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name);

  async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async readText(
    filePath: string,
    encoding: BufferEncoding = 'utf8',
  ): Promise<string> {
    return fs.readFile(filePath, encoding);
  }

  async readJson<T>(filePath: string): Promise<T> {
    const content = await this.readText(filePath);
    return JSON.parse(content) as T;
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    this.logger.debug(
      `Written: ${filePath} (${Buffer.byteLength(content)} bytes)`,
    );
  }

  async exists(filePath: string): Promise<boolean> {
    return fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async remove(targetPath: string): Promise<void> {
    await fs.rm(targetPath, { recursive: true, force: true });
  }

  async readDir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  async stat(
    filePath: string,
  ): Promise<{ size: number; isDirectory: boolean }> {
    const stats = await fs.stat(filePath);
    return { size: stats.size, isDirectory: stats.isDirectory() };
  }

  async copyFile(src: string, dest: string): Promise<void> {
    await this.ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
  }
}
