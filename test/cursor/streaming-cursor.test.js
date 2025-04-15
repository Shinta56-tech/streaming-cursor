import { StreamingCursor } from "../../dist/src/index.js";

let cursor = new StreamingCursor();
cursor.debugMode = true; // デバッグモードを有効にする
cursor.maxConcurrency = 5; // 最大同時実行数を5に設定
cursor.maxIndex = 10; // 最大インデックスを10に設定
cursor.bufferSize = 5; // バッファサイズを5に設定
// インデックスを返す。1から5秒までのランダム時間を待つ
cursor.getData = async (index) => {
  await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5000)));
  return index;
};
cursor.reset = async () => {
  cursor.index = 0;
  cursor.streamedMaxIndex = -1;
};

while (cursor.hasNext) {
  const data = await cursor.next();
  await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 1000)));
  console.log("get ", data);
}
await cursor.reset();
console.log("index ", cursor.index);
