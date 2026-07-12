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
let isTopicVisible = true;
const historyList = [];
const maxHistoryCount = 5;

// 直前と同じものを避けるためのキャッシュ
let lastCategory = "";
let lastTopic = "";

// ==========================================
// 関数定義
// ==========================================

// 画面ロード時の初期化
window.onload = function() {
  renderRules();
  switchMode('host');
};

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
    judgeTab.classList.add('active');
  } else {
    hostPanel.classList.remove('active');
    judgePanel.classList.add('active');
    hostTab.classList.remove('active');
    judgeTab.classList.add('active');
    
    // 判定員画面を開いたタイミングで、現在の選択に基づきボタン群を再構成
    showJudgeChoices();
  }
}

/**
 * ランダムでお題を抽選する
 * カテゴリ・お題ともに連続で重複しないように制御
 */
function drawTopic() {
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

  // 履歴更新処理 (すでに何か引かれていた場合のみ)
  if (currentCategory && currentTopic) {
    updateHistory(currentCategory, currentTopic);
  }

  // 現在の状態を上書き更新
  currentCategory = selectedCategory;
  currentTopic = selectedTopic;
  lastCategory = selectedCategory;
  lastTopic = selectedTopic;
  
  isTopicVisible = true; // 新しいお題は初期表示状態にする

  // 画面表示への反映
  document.getElementById('categoryText').innerText = currentCategory;
  document.getElementById('topicText').innerText = currentTopic;
}

/**
 * お題の表示・非表示（？？？）を切り替える
 */
function toggleTopic() {
  if (!currentTopic) return;
  
  isTopicVisible = !isTopicVisible;
  const topicEl = document.getElementById('topicText');
  
  if (isTopicVisible) {
    topicEl.innerText = currentTopic;
  } else {
    topicEl.innerText = "？？？";
  }
}

/**
 * 司会の選択カテゴリに応じて判定員側のボタン一覧を生成する
 */
function showJudgeChoices() {
  const judgeCategoryText = document.getElementById('judgeCategoryText');
  const choiceArea = document.getElementById('choiceArea');
  
  // 初期化
  choiceArea.innerHTML = "";

  if (!currentCategory) {
    judgeCategoryText.innerText = "お題が未選択です";
    return;
  }

  judgeCategoryText.innerText = currentCategory;
  const choices = topicData[currentCategory];

  // 選択肢ボタンを動的に配置
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
  
  // フェードインのアニメーション実装
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
 * 直近5件の履歴を更新・描画する
 */
function updateHistory(category, topic) {
  // 先頭に追加
  historyList.unshift({ category, topic });
  
  // 5件を超えたら古いものを削除
  if (historyList.length > maxHistoryCount) {
    historyList.pop();
  }

  const historyArea = document.getElementById('historyArea');
  historyArea.innerHTML = "";

  historyList.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="history-tag">${item.category}</span>
      <strong>${item.topic}</strong>
    `;
    historyArea.appendChild(div);
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
