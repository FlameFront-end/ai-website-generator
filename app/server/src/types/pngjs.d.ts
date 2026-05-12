declare module 'pngjs' {
  import { Duplex } from 'stream';

  export class PNG extends Duplex {
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };

    data: Buffer;
    gamma: number;
    height: number;
    width: number;

    constructor(options?: { width?: number; height?: number; fill?: boolean });
  }
}
