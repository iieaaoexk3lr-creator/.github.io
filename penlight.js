import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Firebase構成オブジェクト
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const myUserId = "user_" + Math.random().toString(36).substring(2, 10);

document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('appContainer');
    const penlightBody = document.getElementById('penlightBody');
    const lightField = document.getElementById('lightField');
    const leftBar = document.querySelector('.left-bar');
    const rightBar = document.querySelector('.right-bar');
    const modeText = document.getElementById('modeText');

    const adminToggle = document.getElementById('adminToggle');
    const btnBlink = document.getElementById('btnBlink');
    const btnPulse = document.getElementById('btnPulse');
    const btnPattern = document.getElementById('btnPattern');
    const btnSync = document.getElementById('btnSync');
    const btnHide = document.getElementById('btnHide');
    const btnOff = document.getElementById('btnOff');

    const rangeGlow = document.getElementById('rangeGlow');
    const rangeBright = document.getElementById('rangeBright');
    const rangeSpeed = document.getElementById('rangeSpeed');
    const valGlow = document.getElementById('valGlow');
    const valBright = document.getElementById('valBright');
    const valSpeed = document.getElementById('valSpeed');

    // カラープリセット
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

    let activeColor = '#FF0000';
    let activeMode = 'solid'; // 'solid', 'blink', 'pulse', 'off'
    let isRainbow = false;
    let rainbowPattern = 'flash'; // 'flash' または 'fade'

    let glowFactor = 0.2;
    let brightFactor = 1.0;
    let speedFactor = 1.0;

    let amIAdmin = false;
    let lastMyTapTime = 0;
    let rainbowTimer = null;
    let fadeIndex = 0;

    // 🎨 カラーバー構築
    function initColorBars() {
        leftBar.innerHTML = '';
        rightBar.innerHTML = '';

        [leftBar, rightBar].forEach(barContainer => {
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

                barContainer.appendChild(btn);
            });
        });
    }

    // 🎨 手動での色変更処理
    function executeColorChange(colorCode) {
        if (activeMode === 'off') activeMode = 'solid';
        btnOff.classList.remove('active');

        // ★ 変更1：色変更前に必ずタイマーをクリア
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

    function syncActiveColorUI(colorCode) {
        document.querySelectorAll('.c-cell').forEach(btn => {
            if (btn.getAttribute('data-color') === colorCode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // 🌈 虹色ループ処理
    function startRainbowProcessor() {
        stopRainbowProcessor(); // 二重起動防止

        let step = 0;
        const flashInterval = Math.max(100, Math.round(600 / speedFactor));
        const fadeInterval = Math.max(200, Math.round(2000 / speedFactor));

        if (rainbowPattern === 'flash') {
            penlightBody.style.transition = 'background 0.1s linear, filter 0.15s linear';
            rainbowTimer = setInterval(() => {
                activeColor = rainbowSequence[step];
                applyLightVisual();
                step = (step + 1) % rainbowSequence.length;
            }, flashInterval);
        } else {
            const transitionSec = (fadeInterval / 1000).toFixed(1);
            penlightBody.style.transition = `background ${transitionSec}s linear, filter 0.15s linear`;
            
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
        if (rainbowTimer) { 
            clearInterval(rainbowTimer); 
            rainbowTimer = null; 
        }
        // 虹色離脱時に通常のアニメーション推移へ戻す
        penlightBody.style.transition = 'background 0.15s linear, filter 0.15s linear';
    }

    // 🌟 ビジュアル適用（光量・カラー）
    function applyLightVisual() {
        if (activeMode === 'off') return;

        penlightBody.style.setProperty('--pen-color', activeColor);

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

    // ⚡ スピード変更時の適用処理
    function applySpeedChange() {
        const blinkTime = (0.1 / speedFactor).toFixed(2);
        const pulseTime = (1.5 / speedFactor).toFixed(2);

        // CSS変数でアニメーション周期を更新
        penlightBody.style.setProperty('--blink-speed', `${blinkTime}s`);
        penlightBody.style.setProperty('--pulse-speed', `${pulseTime}s`);

        // ★ 変更2：エフェクト実行中であれば一度クラスを剥がしてCSSアニメーションを再計算させる
        if (activeMode === 'blink') {
            penlightBody.classList.remove('effect-blink');
            void penlightBody.offsetWidth; // リフロー発生によるアニメーション再リセット
            penlightBody.classList.add('effect-blink');
        } else if (activeMode === 'pulse') {
            penlightBody.classList.remove('effect-pulse');
            void penlightBody.offsetWidth;
            penlightBody.classList.add('effect-pulse');
        }

        // 虹色タイマーの更新
        if (isRainbow) {
            startRainbowProcessor();
        }
    }

    // エフェクト（点滅・明滅）の切り替え
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

    // 管理者コマンド送信
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

    // 📡 Firebaseリアルタイム連動：管理者IDの監視
    onValue(ref(db, 'pen_light/active_admin_id'), (snapshot) => {
        const currentAdminId = snapshot.val();
        if (currentAdminId === myUserId) {
            amIAdmin = true;
            adminToggle.checked = true;
            appContainer.classList.add('admin-active');
            if (modeText) modeText.innerText = "👑 管理モード";
        } else {
            amIAdmin = false;
            adminToggle.checked = false;
            appContainer.classList.remove('admin-active');
            if (modeText) {
                modeText.innerText = currentAdminId ? "👥 参加モード (連動中)" : "👥 参加モード";
            }
        }
    });

    // 📡 Firebaseリアルタイム連動：管理コマンドの受領
    onValue(ref(db, 'pen_light/last_command'), (snapshot) => {
        if (amIAdmin) return; // 自分自身が管理者の場合は受信処理を無視
        const cmd = snapshot.val();
        if (!cmd) return;
        if (cmd.timestamp < lastMyTapTime) return; // 自分の最後の手動操作より古いコマンドは無視

        applyExternalCommand(cmd);
    });

    // 🔄 同期コマンドの適用ロジック（★大幅改修箇所）
    function applyExternalCommand(cmd) {
        // ① 全タイマー・全CSSエフェクトの完全リセット
        stopRainbowProcessor();
        clearEffectsUI();
        btnOff.classList.remove('active');

        // ② 基本設定値の受け取りと表示の同期
        activeMode = cmd.mode;
        rainbowPattern = cmd.pattern || 'flash';
        btnPattern.innerText = (rainbowPattern === 'fade') ? '虹:滑らか' : '虹:一瞬';

        // スライダー／コントロールパネルUIの表示同期
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
            
            // アニメーション周期（--pulse-speed等）の更新
            const blinkTime = (0.1 / speedFactor).toFixed(2);
            const pulseTime = (1.5 / speedFactor).toFixed(2);
            penlightBody.style.setProperty('--blink-speed', `${blinkTime}s`);
            penlightBody.style.setProperty('--pulse-speed', `${pulseTime}s`);
        }

        // ③ 色とパターンの適用処理
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
                return; // 消灯時はエフェクト付与を行わずに終了
            }
            applyLightVisual();
        }

        // ④ エフェクト（点滅/明滅）の再適用
        if (activeMode === 'blink') {
            btnBlink.classList.add('active');
            penlightBody.classList.add('effect-blink');
        } else if (activeMode === 'pulse') {
            btnPulse.classList.add('active');
            penlightBody.classList.add('effect-pulse');
        }
    }

    // 🎛️ イベントUI操作群
    rangeGlow.addEventListener('input', (e) => {
        lastMyTapTime = Date.now();
        glowFactor = parseFloat(e.target.value);
        valGlow.innerText = glowFactor.toFixed(1);
        applyLightVisual();
        sendAdminCommand();
    });

    rangeBright.addEventListener('input', (e) => {
        lastMyTapTime = Date.now();
        const val = parseInt(e.target.value);
        brightFactor = val / 100;
        valBright.innerText = val;
        penlightBody.style.filter = `brightness(${brightFactor})`;
        sendAdminCommand();
    });

    rangeSpeed.addEventListener('input', (e) => {
        lastMyTapTime = Date.now();
        speedFactor = parseFloat(e.target.value);
        valSpeed.innerText = speedFactor.toFixed(1);
        applySpeedChange();
        sendAdminCommand();
    });

    adminToggle.addEventListener('change', () => {
        if (adminToggle.checked) {
            set(ref(db, 'pen_light/active_admin_id'), myUserId);
        } else {
            set(ref(db, 'pen_light/active_admin_id'), null);
        }
    });

    btnBlink.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        lastMyTapTime = Date.now();
        toggleEffect('blink', btnBlink, 'effect-blink'); 
    });

    btnPulse.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        lastMyTapTime = Date.now();
        toggleEffect('pulse', btnPulse, 'effect-pulse'); 
    });

    btnPattern.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isRainbow) return;
        lastMyTapTime = Date.now();
        rainbowPattern = (rainbowPattern === 'flash') ? 'fade' : 'flash';
        btnPattern.innerText = (rainbowPattern === 'fade') ? '虹:滑らか' : '虹:一瞬';
        startRainbowProcessor();
        sendAdminCommand();
    });

    // 手動強制同期ボタン（自分のTap制限をクリアして最新データに追従）
    btnSync.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (amIAdmin) return;
        try {
            const snapshot = await get(ref(db, 'pen_light/last_command'));
            const cmd = snapshot.val();
            if (cmd) {
                lastMyTapTime = 0; // 手動操作によるロックを解除
                applyExternalCommand(cmd);
            }
        } catch (error) {
            console.error("同期失敗:", error);
        }
    });

    btnHide.addEventListener('click', (e) => {
        e.stopPropagation();
        appContainer.classList.add('ui-hidden');
    });

    btnOff.addEventListener('click', (e) => {
        e.stopPropagation();
        lastMyTapTime = Date.now();

        if (activeMode === 'off') {
            activeMode = 'solid';
            btnOff.classList.remove('active');
            if (isRainbow) {
                startRainbowProcessor();
            } else {
                applyLightVisual();
                syncActiveColorUI(activeColor);
            }
        } else {
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

    // 画面タップでUI再表示 or 全画面切り替え
    lightField.addEventListener('click', () => {
        if (appContainer.classList.contains('ui-hidden')) {
            appContainer.classList.remove('ui-hidden');
            return;
        }
        if (!document.fullscreenElement) {
            appContainer.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    // 初期化実行
    initColorBars();
    applyLightVisual();
});
