/**
 * Interface defining the basic operations of a cursor.
 */
interface ICursor {
  /**
   * Checks if there is a next item available.
   */
  get hasNext(): boolean;

  /**
   * Retrieves the next item.
   * @returns {Promise<any>} A promise resolving to the next item.
   */
  next(): Promise<any>;

  /**
   * Resets the cursor to its initial state.
   * @returns {Promise<void>} A promise that resolves when the reset is complete.
   */
  reset(): Promise<void>;
}

/**
 * A class for managing a buffer of data.
 */
class Buffer {
  [key: string]: any;
  private keys: string[] = [];

  /**
   * Gets the first key in the buffer.
   * @returns {string} The first key.
   */
  public get firstKey(): string {
    return this.keys[0];
  }

  /**
   * Adds a key-value pair to the buffer.
   * @param {string} key - The key to add.
   * @param {any} value - The value to associate with the key.
   */
  public set(key: string, value: any): void {
    if (!this[key]) this.keys.push(key);
    this[key] = value;
  }

  /**
   * Gets the number of items in the buffer.
   * @returns {number} The number of items.
   */
  public get length(): number {
    return this.keys.length;
  }

  /**
   * Removes a specific key and its associated value from the buffer.
   * @param {string} key - The key to remove.
   */
  public drop(key: string): void {
    const index = this.keys.indexOf(key);
    if (index !== -1) {
      this.keys.splice(index, 1);
      delete this[key];
    }
  }

  /**
   * Removes the first `count` items from the buffer.
   * @param {number} count - The number of items to remove.
   */
  public dropFirst(count: number): void {
    const dropKeys = this.keys.splice(0, count);
    for (const key of dropKeys) {
      delete this[key];
    }
  }
}

/**
 * A class for managing asynchronous data streaming with concurrency control.
 */
export class StreamingCursor implements ICursor {
  private buffer: Buffer;

  /** The current index of the cursor. */
  public index: number = 0;

  /** The current number of active concurrent operations. */
  public currency: number = 0;

  /** The maximum index the cursor can reach. */
  public maxIndex: number = 100;

  /** The maximum number of concurrent operations allowed. */
  public maxConcurrency: number = 10;

  /** The maximum size of the buffer. */
  public bufferSize: number = 50;

  /** The highest index that has been streamed so far. */
  public streamedMaxIndex: number = -1;

  /** Enables or disables debug mode. */
  public debugMode: boolean = false;

  /**
   * A function to retrieve data for a given index.
   * Must be implemented by the user.
   * @param {number} index - The index to retrieve data for.
   * @returns {Promise<any>} A promise resolving to the data.
   */
  public getData: (index: number) => Promise<any>;

  /**
   * A function to reset the cursor.
   * Must be implemented by the user.
   * @returns {Promise<void>} A promise that resolves when the reset is complete.
   */
  public reset: () => Promise<void>;

  constructor() {
    this.buffer = new Buffer();

    // Default implementation of getData
    this.getData = async (index: number): Promise<any> => {
      return index;
    };

    // Default implementation of reset
    this.reset = async (): Promise<void> => {
      this.index = 0;
      this.streamedMaxIndex = -1;
    };
  }

  /**
   * Checks if there is a next item available.
   * @returns {boolean} True if there is a next item, false otherwise.
   */
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

  /**
   * Retrieves the next item.
   * @returns {Promise<any>} A promise resolving to the next item.
   */
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

  /**
   * Streams data asynchronously while respecting concurrency and buffer limits.
   * @param {number} index - The index to start streaming from.
   * @param {boolean} [advance=false] - Whether to advance the streaming process.
   * @returns {Promise<void>} A promise that resolves when streaming is complete.
   */
  private async streaming(index: number, advance: boolean = false): Promise<void> {
    let checkFlag = true;

    // Check conditions for streaming
    if (
      index >= this.maxIndex || // Index exceeds maxIndex
      this.buffer[index] || // Data already exists in the buffer
      this.currency >= this.maxConcurrency || // Concurrency limit reached
      this.buffer.length >= this.bufferSize // Buffer size limit reached
    ) {
      if (!advance) {
        return;
      } else {
        checkFlag = false;
      }
    }

    // Perform streaming if conditions are met
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
          })
      );
    }

    // Advance streaming if required
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
