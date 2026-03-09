// =========================================================================
// ローカルデータベースマネージャー (IndexedDB)
// =========================================================================

const DB_NAME = 'LifeLogDB';
const DB_VERSION = 1;

// IndexedDBの初期化と取得
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('logs')) {
                // 全ての記録を保持する一つの大きなストア。type (diary|weight|money|walk|run) で区別する
                const store = db.createObjectStore('logs', { keyPath: 'id' });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// データの追加または更新
export async function saveLog(data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');

        // idがない場合は自動生成 (タイムスタンプ + ランダム文字列)
        if (!data.id) {
            data.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // 更新日時を記録
        data.timestamp = Date.now();
        if (!data.date) {
            // dateが未指定なら今日の日付 (YYYY-MM-DD)ローカル時間ベース
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            data.date = `${year}-${month}-${day}`;
        }

        const request = store.put(data);
        request.onsuccess = () => resolve(data);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 指定したタイプのデータを全件取得（日付の降順）
export async function getLogsByType(type) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('type');
        const request = index.getAll(IDBKeyRange.only(type));

        request.onsuccess = () => {
            // 日付降順・次いでタイムスタンプ降順でソート
            const result = request.result.sort((a, b) => {
                if (a.date !== b.date) {
                    return b.date.localeCompare(a.date);
                }
                return b.timestamp - a.timestamp;
            });
            resolve(result);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

// データの削除
export async function deleteLog(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

// 全データの取得 (同期用)
export async function getAllLogs() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// コンフリクト解決しつつ複数データを流し込む (同期用)
// リモートのデータとローカルで同一IDのものは新しいtimestampを優先する
export async function syncLogs(remoteLogs) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');

        // トランザクションが完了したかどうかを追尾
        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(e.target.error);

        remoteLogs.forEach((remoteLog) => {
            const getReq = store.get(remoteLog.id);
            getReq.onsuccess = () => {
                const localLog = getReq.result;
                // ローカルに存在しない、またはリモートの方が新しい場合は上書き
                if (!localLog || remoteLog.timestamp > localLog.timestamp) {
                    store.put(remoteLog);
                }
            };
        });
    });
}
