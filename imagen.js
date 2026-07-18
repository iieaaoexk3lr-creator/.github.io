// ==========================================
// お題データ管理定義
// 後から追加・削除がしやすい構造にしています
// ==========================================
const topicData = {
  "感情": [
    "楽しい", "悲しい", "怒り", "優しい", "切ない", 
    "幸せ", "寂しい", "感動", "熱い", "癒やされる"
  ],
  "テーマ": [
    "恋愛", "青春", "友情", "勇気", "希望", 
    "夢", "別れ", "人生", "挑戦", "絆"
  ]
};

// 状態管理変数
let currentCategory = "";
let currentTopic = "";
let historyList = []; 
let drawCount = 0; // 現在のお題決定セッション内での抽選回数カウント

// 判定員が今自分で選択しているカテゴリの初期値
let judgeSelectedCategory = "感情";

// 直前と同じものを避けるためのキャッシュ
let lastCategory = "";
let lastTopic = "";

// ==========================================
// 関数定義
// ==========================================

// 画面ロード時の初期化
window.onload = function() {
  renderRules();
  loadDataFromStorage(); 
  switchMode('host');
};

/**
 * ローカルストレージからのデータ読み込み処理
 */
function loadDataFromStorage() {
  const savedHistory = localStorage.getItem('imagen_historyList');
  const savedCurrent = localStorage.getItem('imagen_currentData');
  const savedDrawCount = localStorage.getItem('imagen_drawCount');

  if (savedHistory) {
    historyList = JSON.parse(savedHistory);
  }
  
  if (savedCurrent) {
    const current = JSON.parse(savedCurrent);
    currentCategory = current.category;
    currentTopic = current.topic;
    lastCategory = current.lastCategory;
    lastTopic = current.lastTopic;
    
    document.getElementById('categoryText').innerText = currentCategory || "---";
    document.getElementById('topicText').innerText = currentTopic || "---";
  }

  if (savedDrawCount) {
    drawCount = parseInt(savedDrawCount, 10) || 0;
  }

  updateControlButtons();
  renderHistory();
  renderSummary();
}

/**
 * ローカルストレージへのデータ保存処理
 */
function saveDataToStorage() {
  localStorage.setItem('imagen_historyList', JSON.stringify(historyList));
  
  const current = {
    category: currentCategory,
    topic: currentTopic,
    lastCategory: lastCategory,
    lastTopic: lastTopic
  };
  localStorage.setItem('imagen_currentData', JSON.stringify(current));
  localStorage.setItem('imagen_drawCount', drawCount.toString());
}

/**
 * 司会モードと判定員モードの表示を切り替える
 * @param {string} mode - 'host' または 'judge'
 */
function switchMode(mode) {
  const hostPanel = document.getElementById('hostMode');
  const judgePanel = document.getElementById('judgeMode');
  const hostTab = document.getElementById('btnHostTab');
  const judgeTab = document.getElementById('btnJudgeTab');

  if (mode === 'host') {
    hostPanel.classList.add('active');
    judgePanel.classList.remove('active');
    hostTab.classList.add('active');
    judgeTab.classList.remove('active');
  } else {
    hostPanel.classList.remove('active');
    judgePanel.classList.add('active');
    hostTab.classList.remove('active');
    judgeTab.classList.add('active');
    
    showJudgeChoices();
  }
}

/**
 * 判定員が自分でカテゴリ（感情・テーマ）を切り替える関数
 * @param {string} category - '感情' または 'テーマ'
 */
function changeJudgeCategory(category) {
  judgeSelectedCategory = category;
  
  document.getElementById('btnJudgeCategory-感情').classList.remove('active');
  document.getElementById('btnJudgeCategory-テーマ').classList.remove('active');
  document.getElementById(`btnJudgeCategory-${category}`).classList.add('active');
  
  showJudgeChoices();
}

/**
 * ランダムでお題を抽選する（最大3回まで）
 * カテゴリ・お題ともに連続で重複しないように制御
 */
function drawTopic() {
  if (drawCount >= 3) return;

  const categories = Object.keys(topicData);
  let selectedCategory = "";
  let selectedTopic = "";

  // 1. カテゴリの決定
  if (categories.length > 1) {
    do {
      selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    } while (selectedCategory === lastCategory);
  } else {
    selectedCategory = categories[0];
  }

  // 2. お題の決定
  const topicPool = topicData[selectedCategory];
  if (topicPool.length > 1) {
    do {
      selectedTopic = topicPool[Math.floor(Math.random() * topicPool.length)];
    } while (selectedTopic === lastTopic);
  } else {
    selectedTopic = topicPool[0];
  }

  // 現在の状態を仮上書き更新
  currentCategory = selectedCategory;
  currentTopic = selectedTopic;
  lastCategory = selectedCategory;
  lastTopic = selectedTopic;

  drawCount++;

  // 画面表示への反映
  document.getElementById('categoryText').innerText = currentCategory;
  document.getElementById('topicText').innerText = currentTopic;

  updateControlButtons();
  saveDataToStorage();
}

/**
 * 現在仮決定しているお題を「確定」して履歴に反映する
 */
function confirmTopic() {
  if (!currentCategory || !currentTopic) return;

  // 確定ボタンが押されたタイミングで初めて履歴配列の先頭に追加
  updateHistory(currentCategory, currentTopic);
  
  // 次回セッションのためにカウントをリセット
  drawCount = 0;

  updateControlButtons();
  saveDataToStorage();
}

/**
 * 抽選回数に基づいて司会モードのボタン状態とテキストを更新する
 */
function updateControlButtons() {
  const btnDraw = document.getElementById('btnDrawTopic');
  const btnConfirm = document.getElementById('btnConfirmTopic');

  if (drawCount === 0) {
    btnDraw.innerText = "お題を引く";
    btnDraw.disabled = false;
    btnConfirm.disabled = true;
    btnConfirm.innerText = "お題が未決定です";
  } else {
    btnConfirm.disabled = false;
    btnConfirm.innerText = `このお題に決定する (「${currentTopic}」に確定)`;

    if (drawCount >= 3) {
      btnDraw.innerText = "これ以上引き直せません (上限3回)";
      btnDraw.disabled = true;
    } else {
      btnDraw.innerText = `お題を引き直す (残り ${3 - drawCount} 回)`;
      btnDraw.disabled = false;
    }
  }
}

/**
 * 判定員が選択しているカテゴリに応じて判定員側のボタン一覧を生成する
 */
function showJudgeChoices() {
  const choiceArea = document.getElementById('choiceArea');
  choiceArea.innerHTML = "";

  const choices = topicData[judgeSelectedCategory];

  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'btn-choice active-press';
    btn.innerText = choice;
    btn.onclick = () => selectChoice(choice);
    choiceArea.appendChild(btn);
  });
}

/**
 * 判定員がボタンを選択した際の処理
 * @param {string} choice - 選択されたお題のテキスト
 */
function selectChoice(choice) {
  showCard(choice);
}

/**
 * 判定札（全画面）を表示する
 * @param {string} text - 札に表示するテキスト
 */
function showCard(text) {
  const cardScreen = document.getElementById('cardScreen');
  const cardText = document.getElementById('cardText');
  
  cardText.innerText = text;
  
  cardScreen.style.display = 'flex';
  cardScreen.style.opacity = '0';
  
  setTimeout(() => {
    cardScreen.style.transition = 'opacity 0.2s ease';
    cardScreen.style.opacity = '1';
  }, 10);
}

/**
 * 判定札を閉じて一覧に戻る
 */
function closeCard() {
  const cardScreen = document.getElementById('cardScreen');
  cardScreen.style.opacity = '0';
  
  setTimeout(() => {
    cardScreen.style.display = 'none';
  }, 200);
}

/**
 * 新しい履歴データをデータ配列の先頭に追加する
 */
function updateHistory(category, topic) {
  historyList.unshift({
    id: Date.now(), 
    category,
    topic,
    teamName: "",
    matchCount: 0,
    isAllMatch: false
  });

  renderHistory();
  renderSummary();
}

/**
 * 履歴エリアの動的描画（最大選択人数を15人に拡張）
 */
function renderHistory() {
  const historyArea = document.getElementById('historyArea');
  historyArea.innerHTML = "";

  if (historyList.length === 0) {
    historyArea.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:16px;">履歴はまだありません</div>`;
    return;
  }

  historyList.forEach((item, index) => {
    // 0人から15人までの選択プルダウンを生成
    let optionsHtml = "";
    for (let i = 0; i <= 15; i++) {
      optionsHtml += `<option value="${i}" ${item.matchCount == i ? 'selected' : ''}>${i}人</option>`;
    }

    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-header">
        <span>第 ${historyList.length - index} 回戦</span>
        <span>[ ${item.category} ]</span>
      </div>
      <div class="history-main">${item.topic}</div>
      <div class="history-inputs">
        <input type="text" placeholder="チーム名" value="${item.teamName}" onchange="updateHistoryInput(${item.id}, 'teamName', this.value)">
        <select onchange="updateHistoryInput(${item.id}, 'matchCount', this.value)">
          ${optionsHtml}
        </select>
      </div>
      <div>
        <label class="checkbox-container">
          <input type="checkbox" ${item.isAllMatch ? 'checked' : ''} onchange="updateHistoryInput(${item.id}, 'isAllMatch', this.checked)">
          全員一致ボーナス獲得
        </label>
      </div>
    `;
    historyArea.appendChild(card);
  });
}

/**
 * 履歴カード内に入力された項目をリアルタイムでデータに反映・保存
 */
function updateHistoryInput(id, field, value) {
  const item = historyList.find(x => x.id === id);
  if (item) {
    if (field === 'matchCount') {
      item[field] = parseInt(value, 10) || 0;
    } else {
      item[field] = value;
    }
    saveDataToStorage();
    renderSummary(); 
  }
}

/**
 * チームごとの一致数・全員一致数を集計してテーブルにレンダリングする
 */
function renderSummary() {
  const summaryTableBody = document.getElementById('summaryTableBody');
  summaryTableBody.innerHTML = "";

  const summaryData = {};

  historyList.forEach(item => {
    const team = item.teamName.trim();
    if (!team) return;

    if (!summaryData[team]) {
      summaryData[team] = {
        matchTotal: 0,
        allMatchCount: 0
      };
    }

    summaryData[team].matchTotal += item.matchCount;
    if (item.isAllMatch) {
      summaryData[team].allMatchCount += 1;
    }
  });

  const teams = Object.keys(summaryData);

  if (teams.length === 0) {
    summaryTableBody.innerHTML = `<tr><td colspan="3" style="color:var(--text-muted);font-size:0.85rem;">有効な集計データがありません</td></tr>`;
    return;
  }

  teams.forEach(team => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: left; font-weight: bold;">${team}</td>
      <td>${summaryData[team].matchTotal} 回</td>
      <td style="color: var(--accent-color); font-weight: bold;">${summaryData[team].allMatchCount} 回</td>
    `;
    summaryTableBody.appendChild(tr);
  });
}

/**
 * ルール説明テキストを動的にレンダリングする
 */
function renderRules() {
  const ruleArea = document.getElementById('ruleArea');
  const rules = [
    "case1:各チームから代表者1名が判定員(判定員はラウンドごとに交代可能)",
    "case2:歌う人のチームメンバーが判定員(チーム一丸となってイメージ統一)",
    "case3:歌う人以外全員が判定員(全員で協力して目標点を超えよう)",
    "歌う前に「感情」または「テーマ」だけ公開する",
    "歌う人だけがお題を見る",
    "判定員は歌を聴いてお題を選ぶ",
    "正解した判定員のチームに1ポイント",
    "全判定員が正解した場合、歌った人のチームに追加ポイント"
  ];

  const ul = document.createElement('ul');
  rules.forEach(rule => {
    const li = document.createElement('li');
    li.innerText = rule;
    ul.appendChild(li);
  });
  
  ruleArea.appendChild(ul);
}

/**
 * ルールの折りたたみトグル
 */
function toggleRules() {
  const ruleArea = document.getElementById('ruleArea');
  const arrow = document.getElementById('ruleArrow');
  
  if (ruleArea.style.display === 'block') {
    ruleArea.style.display = 'none';
    arrow.innerText = '▼';
  } else {
    ruleArea.style.display = 'block';
    arrow.innerText = '▲';
  }
}

/**
 * ゲーム内データをすべて初期化（ローカルストレージもクリア）
 */
function resetAllData() {
  if (confirm("すべての対戦履歴、入力されたスコア、現在のお題データを完全に消去します。よろしいですか？")) {
    localStorage.removeItem('imagen_historyList');
    localStorage.removeItem('imagen_currentData');
    localStorage.removeItem('imagen_drawCount');
    
    currentCategory = "";
    currentTopic = "";
    lastCategory = "";
    lastTopic = "";
    historyList = [];
    drawCount = 0;
    
    document.getElementById('categoryText').innerText = "---";
    document.getElementById('topicText').innerText = "---";
    
    updateControlButtons();
    renderHistory();
    renderSummary();
    
    alert("すべてのデータを初期化しました。");
  }
}
