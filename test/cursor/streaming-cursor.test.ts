import { StreamingCursor } from '../../src/cursor/streaming-cursor';

describe('StreamingCursor', () => {
    let cursor: StreamingCursor;

    beforeEach(() => {
        cursor = new StreamingCursor();
        cursor.debugMode = true; // デバッグモードを有効にする
        cursor.maxConcurrency = 3; // 最大同時実行数を5に設定
        // インデックスを返す。1から5秒までのランダム時間を待つ
        cursor.getData = async (index: number): Promise<any> => {
            await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5000)));
            return index;
        }
        // リセット時にインデックスを0にする
        cursor.reset = async (): Promise<void> => {
            cursor.index = 0;
        }
    });

    // デフォルト設定値でカーソルをテスト
    test('default settings', async () => {
        while (cursor.hasNext) {
            const data = await cursor.next();
            expect(data).toBe(cursor.index - 1);
            console.log('get ', data);
        }
        await cursor.reset();
        expect(cursor.index).toBe(0);
    }, 99999999);

    
});