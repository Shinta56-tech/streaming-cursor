interface ICursor {
  get hasNext(): boolean;
  next(): Promise<any>;
  reset(): Promise<void>;
}

class Buffer {
  [key: string]: any;
  private keys: string[] = [];
  public get firstKey(): string {
    return this.keys[0];
  }
  public set(key: string, value: any): void {
    if (!this[key]) this.keys.push(key);
    this[key] = value;
  }
  public get length(): number {
    return this.keys.length;
  }
  public drop(key: string): void {
    const index = this.keys.indexOf(key);
    if (index !== -1) {
      this.keys.splice(index, 1);
      delete this[key];
    }
  }
  public dropFirst(count: number): void {
    const dropKeys = this.keys.splice(0, count);
    for (const key of dropKeys) {
      delete this[key];
    }
  }
}

export class StreamingCursor implements ICursor {
  private buffer: Buffer;

  public index: number = 0;
  public currency: number = 0;

  public maxIndex: number = 100;
  public maxConcurrency: number = 10;
  public bufferSize: number = 50;
  public streamedMaxIndex: number = -1;

  public debugMode: boolean = false;

  public getData: (index: number) => Promise<any>;

  public reset: () => Promise<void>;

  constructor() {
    this.buffer = new Buffer();
    this.getData = async (index: number): Promise<any> => {
      return index;
    };
    this.reset = async (): Promise<void> => {
      this.index = 0;
      this.streamedMaxIndex = -1;
    };
  }

  get hasNext(): boolean {
    if (this.streamedMaxIndex < this.maxIndex) {
      if (!this.buffer[this.index]) {
        this.streaming(this.index, true);
      } else {
        this.streaming(this.streamedMaxIndex + 1);
      }
    }
    return this.index < this.maxIndex;
  }

  async next(): Promise<any> {
    const index: number = this.index;
    try {
      return await this.buffer[this.index++];
    } finally {
      if (this.bufferSize < this.maxIndex) {
        this.buffer.drop(index.toString());
      }
      this.streaming(index + 1, true);
    }
  }

  private async streaming(index: number, advance: boolean = false): Promise<void> {
    // check
    var checkFlag = true;
    {
      if (index >= this.maxIndex || this.buffer[index] || this.currency >= this.maxConcurrency || this.buffer.length >= this.bufferSize) {
        if (!advance) {
          return;
        } else {
          checkFlag = false;
        }
      }
    }
    // streaming
    if (checkFlag) {
      if (this.debugMode) console.log("streaming ", index);
      this.currency++;
      this.buffer.set(
        index.toString(),
        this.getData(index)
          .catch((err) => {
            console.error(err);
            this.buffer.drop(index.toString());
            return null;
          })
          .finally(() => {
            this.currency--;
            this.streamedMaxIndex = Math.max(this.streamedMaxIndex, index);
            this.streaming(index + 1, true);
          })
      );
    }
    // streaming advance
    if (advance) {
      if (this.currency >= this.maxConcurrency) return;
      if (this.buffer.length >= this.bufferSize) return;
      for (let i = index + 1; i < index + this.maxConcurrency; i++) {
        if (this.currency >= this.maxConcurrency) continue;
        if (this.buffer.length >= this.bufferSize) continue;
        this.streaming(i);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      if (this.currency >= this.maxConcurrency) return;
      if (this.buffer.length >= this.bufferSize) return;
      this.streaming(this.streamedMaxIndex + 1);
    }
  }
}
