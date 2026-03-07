// =========================================================================
// Google Drive API 同期マネージャー
// =========================================================================
import { getAllLogs, syncLogs } from './db.js';

// ※ 実際の運用時には秋本さんのGoogle Cloud Consoleで発行したClient IDに置き換えます
const CLIENT_ID = '638411842372-t1cq7fd2rl6lnv6iujdj0kanl7gp6n0m.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'lifelog_backup_v1.json';

let tokenClient;
let accessToken = null;

// 初期化（Google Identity Services）
export function initAuth(onAuthChanged) {
    // GSIのスクリプト読み込み完了を待つ
    if (window.google && window.google.accounts) {
        setupClient(onAuthChanged);
    } else {
        window.addEventListener('load', () => setupClient(onAuthChanged));
    }
}

function setupClient(onAuthChanged) {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                onAuthChanged(true);
                // トークン取得直後に同期を実行
                executeSync();
            }
        },
    });
}

// ユーザーにログイン/認証を要求
export function requestAuth() {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        alert('Google認証モジュールの準備ができていません。');
    }
}

export function isAuthenticated() {
    return !!accessToken;
}

// 同期処理のエントリーポイント
export async function executeSync() {
    if (!accessToken || isSyncing) return;

    isSyncing = true;
    updateSyncUI(true); // UIを同期中状態に

    try {
        const fileId = await getBackupFileId();

        // リモートのデータを取得
        let remoteLogs = [];
        if (fileId) {
            remoteLogs = await downloadBackup(fileId);
        }

        // リモートのデータをローカルにマージして保存
        if (remoteLogs && remoteLogs.length > 0) {
            await syncLogs(remoteLogs);
        }

        // マージ後の全最新データを取得してドライブに上書き保存
        const mergedLogs = await getAllLogs();
        await uploadBackup(fileId, mergedLogs);

        console.log('Sync completed successfully.');
        alert('Googleドライブとの同期が完了しました。');

        // 画面の更新を促す (簡易的のためリロード)
        // 実際にはイベント発火などで対応するのが望ましい
        window.location.reload();

    } catch (error) {
        console.error('Sync failed:', error);
        alert('同期に失敗しました: ' + error.message);
    } finally {
        isSyncing = false;
        updateSyncUI(false);
    }
}

// --- API Helper Methods ---

async function getBackupFileId() {
    const query = `name='${BACKUP_FILE_NAME}' and trashed=false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) throw new Error('Failed to search for backup file.');

    const data = await response.json();
    return data.files.length > 0 ? data.files[0].id : null;
}

async function downloadBackup(fileId) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) throw new Error('Failed to download backup data.');

    return await response.json();
}

async function uploadBackup(fileId, jsonData) {
    const fileContent = JSON.stringify(jsonData);
    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    let url;
    let method;

    if (fileId) {
        // 既存ファイルの更新
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
    } else {
        // 新規作成
        url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        method = 'POST';
    }

    const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
    });

    if (!response.ok) throw new Error('Failed to upload backup data.');
}

// 簡易的なUI更新
function updateSyncUI(syncing) {
    const syncBtn = document.getElementById('btn-sync');
    if (syncBtn) {
        const icon = syncBtn.querySelector('.material-symbols-outlined');
        if (syncing) {
            icon.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span>';
        } else {
            icon.innerHTML = 'cloud_sync';
        }
    }
}
