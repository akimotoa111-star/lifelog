// =========================================================================
// アプリケーション全体のエントリーポイントとルーター
// =========================================================================
import { saveLog, getLogsByType, deleteLog } from './db.js';
import { initAuth, requestAuth, executeSync, isAuthenticated } from './auth.js';

// 各画面の構造
const views = {
  diary: `
    <div class="card">
      <div class="input-group">
        <label class="input-label" for="diary-date">日付</label>
        <input type="date" id="diary-date" class="input-field" />
      </div>
      <div class="input-group">
        <label class="input-label" for="diary-content">今日のできごと</label>
        <textarea id="diary-content" class="input-field" placeholder="今日はどんな1日でしたか？"></textarea>
      </div>
      <button class="btn btn-primary" id="btn-save-diary">保存する</button>
    </div>
    <!-- 過去の日記リスト表示領域 -->
    <div id="list-container" class="list-container">
      <div class="empty-state">
        <span class="material-symbols-outlined">edit_square</span>
        <p>まだ記録がありません</p>
      </div>
    </div>
  `,
  weight: `
    <div class="card">
      <div class="input-group">
        <label class="input-label" for="weight-date">日付</label>
        <input type="date" id="weight-date" class="input-field" />
      </div>
      <div class="input-group">
        <label class="input-label" for="weight-value">体重 (kg)</label>
        <input type="number" step="0.1" id="weight-value" class="input-field" placeholder="例: 65.5" />
      </div>
      <button class="btn btn-primary" id="btn-save-weight">記録する</button>
    </div>
    <!-- グラフ表示領域 -->
    <div class="card" id="weight-chart-container" style="display: none; padding: 16px 8px;">
      <canvas id="weight-chart" style="width:100%; height:200px;"></canvas>
    </div>
    <!-- 履歴リスト表示領域 -->
    <div id="list-container" class="list-container"></div>
  `,
  money: `
    <div class="card">
      <div class="input-group">
        <label class="input-label" for="money-date">日付</label>
        <input type="date" id="money-date" class="input-field" />
      </div>
      <div class="input-group">
        <label class="input-label" for="money-type">種類</label>
        <select id="money-type" class="input-field">
          <option value="expense">支出 (-)</option>
          <option value="income">収入 (+)</option>
        </select>
      </div>
      <div class="input-group">
        <label class="input-label" for="money-amount">金額 (円)</label>
        <input type="number" id="money-amount" class="input-field" placeholder="例: 1000" />
      </div>
      <div class="input-group">
        <label class="input-label" for="money-memo">メモ</label>
        <input type="text" id="money-memo" class="input-field" placeholder="例: コーヒー代" />
      </div>
      <button class="btn btn-primary" id="btn-save-money">追加する</button>
    </div>
    <!-- 残高・履歴表示領域 -->
    <div class="card" id="money-summary-container" style="display: none;">
      <div style="text-align: center; margin-bottom: 16px; font-weight: bold; font-size: 1.1rem;">今月の収支</div>
      <div style="display: flex; justify-content: space-around; margin-bottom: 16px;">
        <div style="text-align: center;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">収入</div>
          <div id="money-income-sum" style="color: #34C759; font-size: 1.1rem; font-weight: bold;">¥0</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">支出</div>
          <div id="money-expense-sum" style="color: #FF3B30; font-size: 1.1rem; font-weight: bold;">¥0</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">収支</div>
          <div id="money-balance-sum" style="font-size: 1.2rem; font-weight: bold;">¥0</div>
        </div>
      </div>
      <div style="height: 150px;">
        <canvas id="money-chart" style="width:100%; height:100%;"></canvas>
      </div>
    </div>
    <div id="list-container" class="list-container"></div>
  `,
  walk: `
    <div class="card">
      <div class="input-group">
        <label class="input-label" for="walk-date">日付</label>
        <input type="date" id="walk-date" class="input-field" />
      </div>
      <div class="input-group">
        <label class="input-label" for="walk-steps">歩数 (歩)</label>
        <input type="number" id="walk-steps" class="input-field" placeholder="例: 8000" />
      </div>
      <div class="input-group">
        <label class="input-label" for="walk-dist">距離 (km)</label>
        <input type="number" step="0.1" id="walk-dist" class="input-field" placeholder="例: 5.5" />
      </div>
      <div class="input-group">
        <label class="input-label" for="walk-time">時間 (分)</label>
        <input type="number" id="walk-time" class="input-field" placeholder="例: 60" />
      </div>
      <button class="btn btn-primary" id="btn-save-walk">記録する</button>
    </div>
    <!-- グラフ表示領域 -->
    <div class="card" id="walk-chart-container" style="display: none; padding: 16px 8px;">
      <canvas id="walk-chart" style="width:100%; height:200px;"></canvas>
    </div>
    <div id="list-container" class="list-container"></div>
  `,
  run: `
    <div class="card">
      <div class="input-group">
        <label class="input-label" for="run-date">日付</label>
        <input type="date" id="run-date" class="input-field" />
      </div>
      <div class="input-group">
        <label class="input-label" for="run-dist">距離 (km)</label>
        <input type="number" step="0.01" id="run-dist" class="input-field" placeholder="例: 10.0" />
      </div>
      <div class="input-group">
        <label class="input-label" for="run-time">時間 (分)</label>
        <input type="number" step="0.1" id="run-time" class="input-field" placeholder="例: 55.5" />
      </div>
      <!-- 自動計算されたペースの表示 -->
      <div class="pace-display" style="margin-bottom: 16px; font-size: 0.9rem; color: var(--color-primary); font-weight: 500;">
        ペース予想: <span id="run-pace">--:--</span> /km
      </div>
      <button class="btn btn-primary" id="btn-save-run">記録する</button>
    </div>
    <div id="list-container" class="list-container"></div>
  `,
  book: `
    <div class="card">
      <div class="input-group">
        <label class="input-label" for="book-date">日付</label>
        <input type="date" id="book-date" class="input-field" />
      </div>
      <div class="input-group">
        <label class="input-label" for="book-title">本のタイトル</label>
        <input type="text" id="book-title" class="input-field" placeholder="例: 走れメロス" />
      </div>
      <div class="input-group">
        <label class="input-label" for="book-memo">感想・メモ</label>
        <textarea id="book-memo" class="input-field" placeholder="気づきや感想を入力"></textarea>
      </div>
      <button class="btn btn-primary" id="btn-save-book">記録する</button>
    </div>
    <div id="list-container" class="list-container"></div>
  `
};

const viewTitles = {
  diary: '日記',
  weight: '体重',
  money: 'お金',
  walk: '歩行',
  run: '走る',
  book: '読書'
};

// =========================================================================
// DOM要素の取得
// =========================================================================
const mainContent = document.getElementById('main-content');
const navTitle = document.getElementById('nav-title');
const navItems = document.querySelectorAll('.nav-item');
const syncBtn = document.getElementById('btn-sync');

let currentView = 'diary';

// =========================================================================
// 通知・ルーター・同期機構
// =========================================================================

// ヘッダーの同期ボタンの処理
if (syncBtn) {
  syncBtn.addEventListener('click', () => {
    if (isAuthenticated()) {
      executeSync();
    } else {
      requestAuth();
    }
  });
}

// 指定した画面（ビュー）を描画する
function renderView(viewName) {
  currentView = viewName;
  // HTMLの中身を入れ替え
  mainContent.innerHTML = views[viewName] || '<div class="empty-state">開発中です</div>';

  // タイトルの変更
  navTitle.textContent = viewTitles[viewName] || 'LifeLog';

  // ナビゲーションボタンのアクティブ状態を更新
  navItems.forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // ビューの初期化処理とデータ読み込み
  initViewLogic(viewName);
  refreshList(viewName);
}

// リストの描画更新
let currentChart = null; // 現在表示中のグラフインスタンスを保持

async function refreshList(viewName) {
  const listContainer = document.getElementById('list-container');
  if (!listContainer) return;

  try {
    const logs = await getLogsByType(viewName);

    // ======== グラフの描画処理 ========
    if (viewName === 'weight') {
      drawWeightChart(logs);
    } else if (viewName === 'walk') {
      drawWalkChart(logs);
    } else if (viewName === 'money') {
      drawMoneyChart(logs);
    } else {
      // グラフがない画面の場合は既存のグラフを破棄して非表示
      if (currentChart) {
        currentChart.destroy();
        currentChart = null;
      }
    }
    // ================================

    if (logs.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">edit_square</span>
          <p>まだ記録がありません</p>
        </div>
      `;
      return;
    }

    let html = '';

    // データタイプ別のリストレンダリング
    logs.forEach(log => {
      html += '<div class="card list-item" style="position: relative;">';
      html += `<div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 4px;">${log.date}</div>`;

      if (viewName === 'diary') {
        const text = log.content ? log.content.replace(/\n/g, '<br>') : '';
        html += `<div style="font-size: 1rem;">${text}</div>`;
      } else if (viewName === 'weight') {
        html += `<div style="font-size: 1.2rem; font-weight: bold;">${log.weight} kg</div>`;
      } else if (viewName === 'money') {
        const sign = log.moneyType === 'income' ? '+' : '-';
        const color = log.moneyType === 'income' ? '#34C759' : '#FF3B30';
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 500;">${log.memo || 'メモなし'}</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: ${color}">${sign}¥${Number(log.amount).toLocaleString()}</div>
          </div>
        `;
      } else if (viewName === 'walk') {
        html += `
          <div style="display: flex; gap: 16px; font-weight: 500;">
            <div><span style="font-size: 1.2rem; font-weight: bold;">${log.steps}</span> 歩</div>
            <div>${log.dist} km</div>
            <div>${log.time} 分</div>
          </div>
        `;
      } else if (viewName === 'run') {
        html += `
          <div style="display: flex; flex-direction: column; gap: 4px; font-weight: 500;">
            <div style="display: flex; gap: 16px;">
              <div><span style="font-size: 1.2rem; font-weight: bold;">${log.dist}</span> km</div>
              <div>${log.time} 分</div>
            </div>
            <div style="font-size: 0.9rem; color: var(--color-primary);">ペース: ${log.pace || '--:--'} /km</div>
          </div>
        `;
      } else if (viewName === 'book') {
        const memoHtml = log.memo ? `<div style="font-size: 0.9rem; margin-top: 4px; color: var(--color-text-secondary);">${log.memo.replace(/\n/g, '<br>')}</div>` : '';
        html += `
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="font-size: 1.1rem; font-weight: bold; color: var(--color-text);">『${log.title}』</div>
            ${memoHtml}
          </div>
        `;
      }

      // 削除ボタン
      html += `
        <button class="icon-button btn-delete" data-id="${log.id}" style="position: absolute; top: 12px; right: 12px; color: var(--color-danger); padding: 4px;" aria-label="削除">
          <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
        </button>
      `;
      html += '</div>';
    });

    listContainer.innerHTML = html;

    // 削除ボタンのイベント登録
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (confirm('この記録を削除しますか？')) {
          const id = e.currentTarget.dataset.id;
          await deleteLog(id);
          refreshList(currentView);
        }
      });
    });

  } catch (e) {
    console.error('Failed to load logs:', e);
  }
}

// 画面ごとのイベントリスナーを登録する仕組み
function initViewLogic(viewName) {
  // 日付フィールドがある場合は今日の日付をデフォルトセット
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    if (!input.value) {
      input.value = new Date().toISOString().split('T')[0];
    }
  });

  if (viewName === 'run') {
    // ランニングペースの自動計算
    const distInput = document.getElementById('run-dist');
    const timeInput = document.getElementById('run-time');
    const paceOutput = document.getElementById('run-pace');

    const calcPace = () => {
      const dist = parseFloat(distInput.value);
      const time = parseFloat(timeInput.value);
      if (dist > 0 && time > 0) {
        // 分/km を計算
        const paceMinDecimal = time / dist;
        const minutes = Math.floor(paceMinDecimal);
        const seconds = Math.round((paceMinDecimal - minutes) * 60);
        // mm:ss 形式に整形
        const paceStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        paceOutput.textContent = paceStr;
        return paceStr;
      } else {
        paceOutput.textContent = '--:--';
        return '';
      }
    };

    distInput.addEventListener('input', calcPace);
    timeInput.addEventListener('input', calcPace);
  }

  // 保存ボタンの処理
  const saveBtnId = `btn-save-${viewName}`;
  const saveBtn = document.getElementById(saveBtnId);
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      try {
        const data = { type: viewName };
        const dateInput = document.getElementById(`${viewName}-date`);
        if (dateInput) data.date = dateInput.value;

        // 入力値の取得とバリデーション
        if (viewName === 'diary') {
          data.content = document.getElementById('diary-content').value;
          if (!data.content) return alert('内容を入力してください');
        } else if (viewName === 'weight') {
          data.weight = document.getElementById('weight-value').value;
          if (!data.weight) return alert('体重を入力してください');
        } else if (viewName === 'money') {
          data.moneyType = document.getElementById('money-type').value;
          data.amount = document.getElementById('money-amount').value;
          data.memo = document.getElementById('money-memo').value;
          if (!data.amount) return alert('金額を入力してください');
        } else if (viewName === 'walk') {
          data.steps = document.getElementById('walk-steps').value;
          data.dist = document.getElementById('walk-dist').value;
          data.time = document.getElementById('walk-time').value;
          if (!data.steps) return alert('歩数を入力してください');
        } else if (viewName === 'run') {
          data.dist = document.getElementById('run-dist').value;
          data.time = document.getElementById('run-time').value;
          data.pace = document.getElementById('run-pace').textContent;
          if (!data.dist || !data.time) return alert('距離と時間を入力してください');
        } else if (viewName === 'book') {
          data.title = document.getElementById('book-title').value;
          data.memo = document.getElementById('book-memo').value;
          if (!data.title) return alert('本のタイトルを入力してください');
        }

        // DBに保存
        await saveLog(data);

        // 入力フォームをクリア（日付以外）
        document.querySelectorAll('.input-field').forEach(input => {
          if (input.type !== 'date' && input.type !== 'select-one') {
            input.value = '';
          }
        });
        if (viewName === 'run') document.getElementById('run-pace').textContent = '--:--';

        // リストを再描画
        refreshList(viewName);

      } catch (e) {
        console.error('Save failed:', e);
        alert('保存に失敗しました');
      }
    });
  }
}

// ナビゲーションのクリックイベント
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const viewName = item.dataset.view;
    renderView(viewName);
  });
});

// ヘッダーの同期ボタンにイベントリスナーを登録
const syncButton = document.getElementById('btn-sync');
if (syncButton) {
  syncButton.addEventListener('click', async () => {
    console.log('Sync button clicked');
    // ここに同期処理を実装
    // 例: await syncDataWithGoogleDrive();
  });
}

// =========================================================================
// グラフ描画機能群 (Chart.js)
// =========================================================================
function drawWeightChart(logs) {
  const chartContainer = document.getElementById('weight-chart-container');
  const canvas = document.getElementById('weight-chart');
  if (!chartContainer || !canvas) return;

  if (logs.length === 0) {
    chartContainer.style.display = 'none';
    if (currentChart) currentChart.destroy();
    return;
  }

  chartContainer.style.display = 'block';

  // データを時系列（古い順）にソートして抽出
  const sortedLogs = [...logs].reverse();
  const labels = sortedLogs.map(log => log.date.substring(5)); // MM-DD 形式
  const data = sortedLogs.map(log => parseFloat(log.weight));

  if (currentChart) currentChart.destroy();

  const ctx = canvas.getContext('2d');
  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '体重 (kg)',
        data: data,
        borderColor: '#0A84FF',
        backgroundColor: 'rgba(10, 132, 255, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#0A84FF',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          // 体重の変化を見やすくするため最小・最大を自動調整 (前後±1kg)
          suggestedMin: Math.floor(Math.min(...data) - 1),
          suggestedMax: Math.ceil(Math.max(...data) + 1)
        }
      }
    }
  });
}

function drawWalkChart(logs) {
  const chartContainer = document.getElementById('walk-chart-container');
  const canvas = document.getElementById('walk-chart');
  if (!chartContainer || !canvas) return;

  if (logs.length === 0) {
    chartContainer.style.display = 'none';
    if (currentChart) currentChart.destroy();
    return;
  }

  chartContainer.style.display = 'block';

  // データを時系列（古い順）にソートして抽出
  const sortedLogs = [...logs].reverse();
  const labels = sortedLogs.map(log => log.date.substring(5)); // MM-DD
  const data = sortedLogs.map(log => parseInt(log.steps, 10));

  if (currentChart) currentChart.destroy();

  const ctx = canvas.getContext('2d');
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '歩数',
        data: data,
        backgroundColor: '#34C759',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function drawMoneyChart(logs) {
  const chartContainer = document.getElementById('money-summary-container');
  const canvas = document.getElementById('money-chart');
  if (!chartContainer || !canvas) return;

  // 今月のデータを抽出 (現状の月 YYYY-MM)
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = todayStr.substring(0, 7);

  const thisMonthLogs = logs.filter(log => log.date && log.date.startsWith(currentMonth));

  // データが0件の場合でもサマリーとグラフ枠自体は表示させる
  chartContainer.style.display = 'block';

  let incomeSum = 0;
  let expenseSum = 0;

  thisMonthLogs.forEach(log => {
    const amount = Number(log.amount) || 0;
    if (log.moneyType === 'income') {
      incomeSum += amount;
    } else {
      expenseSum += amount;
    }
  });

  const balanceSum = incomeSum - expenseSum;

  // サマリーテキストの更新
  const incomeEl = document.getElementById('money-income-sum');
  const expenseEl = document.getElementById('money-expense-sum');
  const balanceEl = document.getElementById('money-balance-sum');

  if (incomeEl) incomeEl.textContent = `+¥${incomeSum.toLocaleString()}`;
  if (expenseEl) expenseEl.textContent = `-¥${expenseSum.toLocaleString()}`;
  if (balanceEl) {
    const sign = balanceSum > 0 ? '+' : '';
    balanceEl.textContent = `${sign}¥${balanceSum.toLocaleString()}`;
    // 黒字なら緑、赤字なら赤
    balanceEl.style.color = balanceSum >= 0 ? '#34C759' : '#FF3B30';
  }

  if (currentChart) currentChart.destroy();

  const ctx = canvas.getContext('2d');
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['収入', '支出'],
      datasets: [{
        data: [incomeSum, expenseSum],
        backgroundColor: ['#34C759', '#FF3B30'],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return '¥' + context.parsed.y.toLocaleString();
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// =========================================================================
// 初期化とグローバルイベント
// =========================================================================
function initApp() {
  // 初期画面を「日記」にする
  renderView('diary');

  // Google認証の初期化 (トークン取得次第同期開始されるようにコールバック設定)
  initAuth((isAuth) => {
    if (isAuth) {
      console.log('Google Auth completed. Ready to sync.');
    }
  });
}

// アプリの起動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // すでにDOMの読み込みが完了している場合 (moduleや非同期の読み込み時)
  initApp();
}

// アプリがバックグラウンドから復帰した際に日付をまたいでいれば自動更新する
let currentToday = new Date().toISOString().split('T')[0];

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const newToday = new Date().toISOString().split('T')[0];
    if (currentToday !== newToday) {
      // 日付が変わっている場合、現在表示中の日付inputで昨日（以前のtoday）のままのものを書き換える
      const dateInputs = document.querySelectorAll('input[type="date"]');
      dateInputs.forEach(input => {
        if (!input.value || input.value === currentToday || input.value < newToday) {
          // 意図的に過去の日付を見ているケース以外は新しい「今日」にリセットする
          input.value = newToday;
        }
      });
      currentToday = newToday;
    }
  }
});
