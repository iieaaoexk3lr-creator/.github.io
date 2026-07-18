import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ユーザー提供のFirebase構成オブジェクト
const firebaseConfig = {
  apiKey: "AIzaSyC4DQhH_swesAD98Xyjg8d1lcWEkkrHrgw",
  authDomain: "gamehistory-m84.firebaseapp.com",
  databaseURL: "https://gamehistory-m84-default-rtdb.firebaseio.com",
  projectId: "gamehistory-m84",
  storageBucket: "gamehistory-m84.firebasestorage.app",
  messagingSenderId: "475761727837",
  appId: "1:475761727837:web:06d07e1ab4120a7ccaf0b4",
  measurementId: "G-3636W6LC4F"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 自分の匿名ユーザーIDをランダムに生成
const myUserId = "user_" + Math.random().toString(36).substring(2, 10);

document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('appContainer');
    const penlightBody = document.getElementById('penlightBody');
    const lightField = document.getElementById('lightField');
    const leftBar = document.querySelector('.left-bar');
    const rightBar = document.querySelector('.right-bar');
    const statusBadge = document.getElementById('statusBadge');
    
    const adminToggle = document.getElementById('adminToggle');
    const btnBlink = document.getElementById('btnBlink');
    const btnPulse = document.getElementById('btnPulse');
    const btnPattern = document.getElementById('btnPattern');
    const btnSync = document.getElementById('btnSync');
    const btnHide = document.getElementById('btnHide');
    const btnOff = document.getElementById('btnOff');

    const colorPresets = [
        { name: '赤', hex: '#FF0000' },
        { name: '橙', hex: '#FF7F00' },
        { name: '黄', hex: '#FFFF00' },
        { name: '緑', hex: '#00FF00' },
        { name: '水', hex: '#00FFFF' },
        { name: '青', hex: '#0000FF' },
        { name: '紫', hex: '#8B00FF' },
        { name: '桃', hex: '#FF69B4' },
        { name: '白', hex: '#FFFFFF' },
        { name: '🌈', hex: 'rainbow' }
    ];
    const rainbowSequence = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#8B00FF', '#FF69B4'];

    // 内部ステート
    let activeColor = '#FF0000';
    let activeMode = 'solid'; // 'solid', 'blink', 'pulse', 'off'
    let isRainbow = false;
    let rainbowPattern = 'flash'; // 'flash' または 'fade'
    
    let amIAdmin = false;       // 自分が管理者かどうか
    let lastMyTapTime = 0;      // 自分が最後に手動で色を変更したタイムスタンプ（ラグ防止用）
    let rainbowTimer = null;
    let uiHidden = false;
    let fadeIndex = 0;

    // カラーバーの構築
    function initColorBars() {
        [leftBar, rightBar].forEach(bar => {
            bar.innerHTML = '';
            colorPresets.forEach(preset => {
                const btn = document.createElement('button');
                btn.className = 'c-cell';
                btn.setAttribute('data-color', preset.hex);
                if (preset.hex === 'rainbow') {
                    btn.classList.add('rainbow-cell');
                    btn.innerText = '🌈';
                } else {
                    btn.style.backgroundColor = preset.hex;
                }
                if (preset.hex === activeColor) btn.classList.add('active');

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // ローカルのタップ時刻を記録（ラグ対策）
                    lastMyTapTime = Date.now();
                    executeColorChange(preset.hex);
                });
                bar.appendChild(btn);
            });
        });
    }

    // 色切り替えのコアロジック
    function executeColorChange(colorCode) {
        if (activeMode === 'off') activeMode = 'solid';
        btnOff.classList.remove('active');
        stopRainbowProcessor();

        if (colorCode === 'rainbow') {
            isRainbow = true;
            btnPattern.disabled = false;
            startRainbowProcessor();
        } else {
            isRainbow = false;
            activeColor = colorCode;
            btnPattern.disabled = true;
            applyLightVisual();
        }

        syncActiveColorUI(colorCode);

        // 🌟【管理者機能】：自分が管理者の場合、Firebaseへ一斉送信命令を書き込む
        if (amIAdmin) {
            set(ref(db, 'pen_light/last_command'), {
                color: colorCode,
                mode: activeMode,
                pattern: rainbowPattern,
                timestamp: Date.now()
            });
        }
    }

    // 左右ボタンのアクティブ表示同期
    function syncActiveColorUI(colorCode) {
        document.querySelectorAll('.c-cell').forEach(btn => {
            if (btn.getAttribute('data-color') === colorCode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // 🌈虹色ループ処理
    function startRainbowProcessor() {
        let step = 0;
        penlightBody.style.transition = 'box-shadow 0.2s ease, background 0.2s ease';

        if (rainbowPattern === 'flash') {
            rainbowTimer = setInterval(() => {
                activeColor = rainbowSequence[step];
                applyLightVisual();
                step = (step + 1) % rainbowSequence.length;
            }, 600);
        } else {
            penlightBody.style.transition = 'background 2.0s linear, box-shadow 2.0s linear';
            activeColor = rainbowSequence[fadeIndex];
            applyLightVisual();
            rainbowTimer = setInterval(() => {
                fadeIndex = (fadeIndex + 1) % rainbowSequence.length;
                activeColor = rainbowSequence[fadeIndex];
                applyLightVisual();
            }, 2000);
        }
    }

    function stopRainbowProcessor() {
        if (rainbowTimer) { clearInterval(rainbowTimer); rainbowTimer = null; }
    }

    // 発光ビジュアルのCSS適用
    function applyLightVisual() {
        if (activeMode === 'off') return;
        penlightBody.style.setProperty('--pen-color', activeColor);
    }

    // エフェクト切り替え
    function toggleEffect(modeName, targetBtn, cssClass) {
        if (activeMode === 'off') return;
        const isCurrentActive = (activeMode === modeName);
        clearEffectsUI();

        if (!isCurrentActive) {
            activeMode = modeName;
            targetBtn.classList.add('active');
            penlightBody.classList.add(cssClass);
        } else {
            activeMode = 'solid';
        }

        // 🌟【管理者機能】：エフェクトの変更を全体に共有
        if (amIAdmin) {
            set(ref(db, 'pen_light/last_command'), {
                color: isRainbow ? 'rainbow' : activeColor,
                mode: activeMode,
                pattern: rainbowPattern,
                timestamp: Date.now()
            });
        }
    }

    function clearEffectsUI() {
        penlightBody.classList.remove('effect-blink', 'effect-pulse');
        btnBlink.classList.remove('active');
        btnPulse.classList.remove('active');
    }

    // --- 🔗 📡 Firebase リアルタイム同期システム 📡 🔗 ---

    // 1. 現在の管理者権限の変更を24時間監視
    onValue(ref(db, 'pen_light/active_admin_id'), (snapshot) => {
        const currentAdminId = snapshot.val();
        
        if (currentAdminId === myUserId) {
            // 自分が管理者である場合
            amIAdmin = true;
            adminToggle.checked = true;
            appContainer.classList.add('admin-active');
            statusBadge.innerText = "👑 管理者モード";
        } else {
            // 誰か別の人が管理者になった、あるいは不在になった場合
            amIAdmin = false;
            adminToggle.checked = false;
            appContainer.classList.remove('admin-active');
            statusBadge.innerText = currentAdminId ? "👥 参加者モード (連動中)" : "👥 参加者モード";
        }
    });

    // 2. 管理者からの一斉送信コマンドを受信（★ラグ対策実装）
    onValue(ref(db, 'pen_light/last_command'), (snapshot) => {
        // 自分が管理者の場合は、自分の操作によるループバックを防ぐため処理をスルー
        if (amIAdmin) return;

        const cmd = snapshot.val();
        if (!cmd) return;

        // 💡 ユーザー提案のラグ対策判定：
        // 管理者がコマンドを送信した時刻が、自分が手元で画面を最後にタップした時刻よりも【古い（過去）】なら、遅延データとみなして無視する
        if (cmd.timestamp < lastMyTapTime) {
            console.log("遅れて届いた古い管理者コマンドをスキップしました。");
            return;
        }

        // 管理者命令の強制反映
        applyExternalCommand(cmd);
    });

    // 外部からのコマンドを適用する共通関数
    function applyExternalCommand(cmd) {
        clearEffectsUI();
        stopRainbowProcessor();
        btnOff.classList.remove('active');

        activeMode = cmd.mode;
        rainbowPattern = cmd.pattern || 'flash';
        btnPattern.innerText = (rainbowPattern === 'fade') ? '虹: 滑らか' : '虹: 一瞬';

        if (cmd.color === 'rainbow') {
            isRainbow = true;
            btnPattern.disabled = false;
            syncActiveColorUI('rainbow');
            startRainbowProcessor();
        } else {
            isRainbow = false;
            btnPattern.disabled = true;
            activeColor = cmd.color;
            syncActiveColorUI(cmd.color);
            
            if (activeMode === 'off') {
                penlightBody.style.setProperty('--pen-color', '#000000');
                penlightBody.style.boxShadow = 'none';
                btnOff.classList.add('active');
                return;
            }
            applyLightVisual();
        }

        // 該当するエフェクトクラスの付与
        if (activeMode === 'blink') {
            btnBlink.classList.add('active');
            penlightBody.classList.add('effect-blink');
        } else if (activeMode === 'pulse') {
            btnPulse.classList.add('active');
            penlightBody.classList.add('effect-pulse');
        }
    }

    // --- 🎛️ 各種コントロールボタン制御 🎛️ ---

    // 管理者スイッチ（トグル）が操作された時
    adminToggle.addEventListener('change', () => {
        if (adminToggle.checked) {
            // 管理者に立候補
            set(ref(db, 'pen_light/active_admin_id'), myUserId);
        } else {
            // 管理者から自ら降りる
            set(ref(db, 'pen_light/active_admin_id'), null);
        }
    });

    // 点滅ボタン
    btnBlink.addEventListener('click', (e) => { e.stopPropagation(); toggleEffect('blink', btnBlink, 'effect-blink'); });

    // 明滅ボタン
    btnPulse.addEventListener('click', (e) => { e.stopPropagation(); toggleEffect('pulse', btnPulse, 'effect-pulse'); });

    // 虹パターン切り替えボタン
    btnPattern.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isRainbow) return;

        rainbowPattern = (rainbowPattern === 'flash') ? 'fade' : 'flash';
        btnPattern.innerText = (rainbowPattern === 'fade') ? '虹: 滑らか' : '虹: 一瞬';

        stopRainbowProcessor();
        startRainbowProcessor();

        // 管理者なら変更を全体に配信
        if (amIAdmin) {
            set(ref(db, 'pen_light/last_command'), {
                color: 'rainbow',
                mode: activeMode,
                pattern: rainbowPattern,
                timestamp: Date.now()
            });
        }
    });

    // ★ユーザー提案の「同期読込（復活）ボタン」
    btnSync.addEventListener('click', async (e) => {
        e.stopPropagation();
        // 自分が管理者の場合は同期不要
        if (amIAdmin) return;

        try {
            // タイムスタンプ無視で、Firebaseから直接最新状態を1回だけガツッと強制取得
            const snapshot = await get(ref(db, 'pen_light/last_command'));
            const cmd = snapshot.val();
            if (cmd) {
                // ラグ防止のタイムスタンプを現在の時刻にリセットして同期を最優先
                lastMyTapTime = 0;
                applyExternalCommand(cmd);
                console.log("最新の管理者状態と強制同期しました。");
            }
        } catch (error) {
            console.error("同期に失敗しました:", error);
        }
    });

    // 非表示ボタン
    btnHide.addEventListener('click', (e) => {
        e.stopPropagation();
        uiHidden = true;
        appContainer.classList.add('ui-hidden');
    });

    // OFF（消灯）ボタン
    btnOff.addEventListener('click', (e) => {
        e.stopPropagation();
        lastMyTapTime = Date.now();
        
        stopRainbowProcessor();
        clearEffectsUI();
        document.querySelectorAll('.c-cell').forEach(b => b.classList.remove('active'));
        
        activeMode = 'off';
        isRainbow = false;
        btnPattern.disabled = true;
        btnOff.classList.add('active');

        penlightBody.style.setProperty('--pen-color', '#000000');
        penlightBody.style.boxShadow = 'none';

        if (amIAdmin) {
            set(ref(db, 'pen_light/last_command'), {
                color: '#000000',
                mode: 'off',
                pattern: rainbowPattern,
                timestamp: Date.now()
            });
        }
    });

    // フルスクリーンおよびUI復帰判定
    lightField.addEventListener('click', () => {
        if (uiHidden) {
            uiHidden = false;
            appContainer.classList.remove('ui-hidden');
            return;
        }

        if (!document.fullscreenElement) {
            appContainer.requestFullscreen().catch(err => {
                console.log(`全画面エラー: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && document.fullscreenElement) {
            document.exitFullscreen();
        }
    });

    // アプリ起動
    initColorBars();
    applyLightVisual();
});
