# streaming-cursor-ts

This repository provides a TypeScript-based streaming cursor implementation suitable for handling large datasets in a streaming fashion. Rather than loading all data into memory at once, it processes data in manageable chunks, which is particularly useful for batch operations or real-time data ingestion.

## Features

- Lightweight and easy to integrate
- Streams data in chunks to reduce memory usage
- Configurable buffering to optimize performance

## Installation

```bash
npm install streaming-cursor-ts
```

## Example Usage of StreamingCursor

Below is a simple example of how to use the `StreamingCursor` class:

```javascript
import { StreamingCursor } from "./dist/src/cursor/streaming-cursor.js";

// Create an instance of StreamingCursor
let cursor = new StreamingCursor();

// Customize settings
cursor.debugMode = true; // Enable debug mode
cursor.maxConcurrency = 5; // Set maximum concurrency to 5
cursor.maxIndex = 100; // Set the maximum index to 100
cursor.bufferSize = 50; // Set the maximum buffer size to 50

// Define the data retrieval logic
cursor.getData = async (index) => {
  // Simulate a random delay between 1 and 5 seconds
  await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5000)));
  return index; // Return the index
};

// Define a reset function for the cursor
cursor.reset = async () => {
  cursor.index = 0;
  // Resetting streamedMaxIndex to -1 is crucial to ensure the cursor fetches data from the beginning on subsequent usage
  cursor.streamedMaxIndex = -1;
};

// Sequentially retrieve data
(async () => {
  while (cursor.hasNext) {
    const data = await cursor.next();
    // Simulate a random delay of up to 1 second
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 1000)));
    console.log("Retrieved data: ", data);
  }

  // Reset the cursor
  await cursor.reset();
  console.log("Index after reset: ", cursor.index);
})();
```

This example demonstrates how to use `StreamingCursor` to asynchronously fetch data while controlling the maximum concurrency and index range. You can customize the `getData` method to implement your own data retrieval logic.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request if you would like to improve this project.

## License

MIT License