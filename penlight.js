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

    // 🎛️ 追加：スライダーUI要素の取得
    const rangeGlow = document.getElementById('rangeGlow');
    const rangeBright = document.getElementById('rangeBright');
    const rangeSpeed = document.getElementById('rangeSpeed');
    const valGlow = document.getElementById('valGlow');
    const valBright = document.getElementById('valBright');
    const valSpeed = document.getElementById('valSpeed');

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

    // 🌟【初期設定】：光の幅を最小（0.2）に設定
    let glowFactor = 0.2;     // 光の幅倍率 (デフォルト: 最小)
    let brightFactor = 1.0;   // 明るさ倍率 (デフォルト: 100%)
    let speedFactor = 1.0;    // 速度倍率 (デフォルト: 1.0x)
    
    let amIAdmin = false;       // 自分が管理者かどうか
    let lastMyTapTime = 0;      // 自分が最後に手動で変更したタイムスタンプ
    let rainbowTimer = null;
    let uiHidden = false;
    let fadeIndex = 0;

    // 初期状態のスライダーUIの値をセット
    if (rangeGlow) {
        rangeGlow.value = glowFactor;
        valGlow.innerText = glowFactor.toFixed(1);
    }

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
        sendAdminCommand();
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

    // 🌈虹色ループ処理（速度倍率適用）
    function startRainbowProcessor() {
        let step = 0;
        penlightBody.style.transition = 'box-shadow 0.2s ease, background 0.2s ease';

        // 速度スライダーに合わせて更新間隔（ミリ秒）を変更
        const flashInterval = Math.max(100, Math.round(600 / speedFactor));
        const fadeInterval = Math.max(200, Math.round(2000 / speedFactor));

        if (rainbowPattern === 'flash') {
            rainbowTimer = setInterval(() => {
                activeColor = rainbowSequence[step];
                applyLightVisual();
                step = (step + 1) % rainbowSequence.length;
            }, flashInterval);
        } else {
            const transitionSec = (fadeInterval / 1000).toFixed(1);
            penlightBody.style.transition = `background ${transitionSec}s linear, box-shadow ${transitionSec}s linear`;
            activeColor = rainbowSequence[fadeIndex];
            applyLightVisual();
            rainbowTimer = setInterval(() => {
                fadeIndex = (fadeIndex + 1) % rainbowSequence.length;
                activeColor = rainbowSequence[fadeIndex];
                applyLightVisual();
            }, fadeInterval);
        }
    }

    function stopRainbowProcessor() {
        if (rainbowTimer) { clearInterval(rainbowTimer); rainbowTimer = null; }
    }

    // 発光ビジュアルのCSS適用（光の幅倍率を反映）
    function applyLightVisual() {
        if (activeMode === 'off') return;
        
        penlightBody.style.setProperty('--pen-color', activeColor);
        
        // スライダーの「glowFactor」を掛け算して光の幅を可変にする（最小設定対応）
        const blur1 = Math.round(40 * glowFactor);
        const spread1 = Math.round(10 * glowFactor);
        const blur2 = Math.round(90 * glowFactor);
        const spread2 = Math.round(25 * glowFactor);
        const blur3 = Math.round(150 * glowFactor);
        const spread3 = Math.round(50 * glowFactor);

        penlightBody.style.boxShadow = `
            0 0 ${blur1}px ${spread1}px var(--pen-color),
            0 0 ${blur2}px ${spread2}px var(--pen-color),
            0 0 ${blur3}px ${spread3}px var(--pen-color)
        `;
    }

    // 速度変更の適用
    function applySpeedChange() {
        const blinkTime = (0.1 / speedFactor).toFixed(2);
        const pulseTime = (1.5 / speedFactor).toFixed(2);

        penlightBody.style.setProperty('--blink-speed', `${blinkTime}s`);
        penlightBody.style.setProperty('--pulse-speed', `${pulseTime}s`);

        if (isRainbow) {
            stopRainbowProcessor();
            startRainbowProcessor();
        }
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

        sendAdminCommand();
    }

    function clearEffectsUI() {
        penlightBody.classList.remove('effect-blink', 'effect-pulse');
        btnBlink.classList.remove('active');
        btnPulse.classList.remove('active');
    }

    // 管理者からの命令を一斉送信する共通関数
    function sendAdminCommand() {
        if (amIAdmin) {
            set(ref(db, 'pen_light/last_command'), {
                color: (activeMode === 'off') ? '#000000' : (isRainbow ? 'rainbow' : activeColor),
                mode: activeMode,
                pattern: rainbowPattern,
                glow: glowFactor,
                bright: brightFactor,
                speed: speedFactor,
                timestamp: Date.now()
            });
        }
    }

    // --- 🔗 📡 Firebase リアルタイム同期システム 📡 🔗 ---

    // 1. 現在の管理者権限の変更を監視
    onValue(ref(db, 'pen_light/active_admin_id'), (snapshot) => {
        const currentAdminId = snapshot.val();
        
        if (currentAdminId === myUserId) {
            amIAdmin = true;
            adminToggle.checked = true;
            appContainer.classList.add('admin-active');
            statusBadge.innerText = "👑 管理者モード";
        } else {
            amIAdmin = false;
            adminToggle.checked = false;
            appContainer.classList.remove('admin-active');
            statusBadge.innerText = currentAdminId ? "👥 参加者モード (連動中)" : "👥 参加者モード";
        }
    });

    // 2. 管理者からの一斉送信コマンドを受信
    onValue(ref(db, 'pen_light/last_command'), (snapshot) => {
        if (amIAdmin) return; // 自分の送信によるループバックを回避

        const cmd = snapshot.val();
        if (!cmd) return;

        if (cmd.timestamp < lastMyTapTime) {
            console.log("遅れて届いた古い管理者コマンドをスキップしました。");
            return;
        }

        applyExternalCommand(cmd);
    });

    // 外部からのコマンドを適用する関数
    function applyExternalCommand(cmd) {
        clearEffectsUI();
        stopRainbowProcessor();
        btnOff.classList.remove('active');

        activeMode = cmd.mode;
        rainbowPattern = cmd.pattern || 'flash';
        btnPattern.innerText = (rainbowPattern === 'fade') ? '虹: 滑らか' : '虹: 一瞬';

        // スライダーパラメータの反映
        if (cmd.glow !== undefined) {
            glowFactor = cmd.glow;
            rangeGlow.value = glowFactor;
            valGlow.innerText = glowFactor.toFixed(1);
        }
        if (cmd.bright !== undefined) {
            brightFactor = cmd.bright;
            rangeBright.value = Math.round(brightFactor * 100);
            valBright.innerText = Math.round(brightFactor * 100);
            penlightBody.style.filter = `brightness(${brightFactor})`;
        }
        if (cmd.speed !== undefined) {
            speedFactor = cmd.speed;
            rangeSpeed.value = speedFactor;
            valSpeed.innerText = speedFactor.toFixed(1);
            applySpeedChange();
        }

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

        if (activeMode === 'blink') {
            btnBlink.classList.add('active');
            penlightBody.classList.add('effect-blink');
        } else if (activeMode === 'pulse') {
            btnPulse.classList.add('active');
            penlightBody.classList.add('effect-pulse');
        }
    }

    // --- 🎛️ 各種コントロール・スライダーイベント 🎛️ ---

    // 1. 光の幅スライダー
    if (rangeGlow) {
        rangeGlow.addEventListener('input', (e) => {
            lastMyTapTime = Date.now();
            glowFactor = parseFloat(e.target.value);
            valGlow.innerText = glowFactor.toFixed(1);
            applyLightVisual();
            sendAdminCommand();
        });
    }

    // 2. 明るさスライダー
    if (rangeBright) {
        rangeBright.addEventListener('input', (e) => {
            lastMyTapTime = Date.now();
            const val = parseInt(e.target.value);
            brightFactor = val / 100;
            valBright.innerText = val;
            penlightBody.style.filter = `brightness(${brightFactor})`;
            sendAdminCommand();
        });
    }

    // 3. 速度スライダー
    if (rangeSpeed) {
        rangeSpeed.addEventListener('input', (e) => {
            lastMyTapTime = Date.now();
            speedFactor = parseFloat(e.target.value);
            valSpeed.innerText = speedFactor.toFixed(1);
            applySpeedChange();
            sendAdminCommand();
        });
    }

    // 管理者スイッチ
    adminToggle.addEventListener('change', () => {
        if (adminToggle.checked) {
            set(ref(db, 'pen_light/active_admin_id'), myUserId);
        } else {
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
        sendAdminCommand();
    });

    // 強制同期ボタン
    btnSync.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (amIAdmin) return;

        try {
            const snapshot = await get(ref(db, 'pen_light/last_command'));
            const cmd = snapshot.val();
            if (cmd) {
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

    // OFF（消灯 / 点灯トグル）ボタン
    btnOff.addEventListener('click', (e) => {
        e.stopPropagation();
        lastMyTapTime = Date.now();

        if (activeMode === 'off') {
            // 【ONにする処理】：直前の色で復帰
            activeMode = 'solid';
            btnOff.classList.remove('active');
            
            if (isRainbow) {
                startRainbowProcessor();
            } else {
                applyLightVisual();
                syncActiveColorUI(activeColor);
            }
        } else {
            // 【OFFにする処理】：消灯して光を消す
            stopRainbowProcessor();
            clearEffectsUI();
            document.querySelectorAll('.c-cell').forEach(b => b.classList.remove('active'));
            
            activeMode = 'off';
            btnOff.classList.add('active');

            penlightBody.style.setProperty('--pen-color', '#000000');
            penlightBody.style.boxShadow = 'none';
        }

        sendAdminCommand();
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

    // アプリ初期化実行
    initColorBars();
    applyLightVisual();
});
