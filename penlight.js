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

    // カラープリセット（左右両方に全10種を同じ配置で設置）
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

    // カラーバー（左右どちらにも全10種を同じ順序で生成）
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

    // 色変更処理
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
        let step = 0;
        penlightBody.style.transition = 'box-shadow 0.2s ease, background 0.2s ease';

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

    // ビジュアル適用
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

    // 📡 Firebaseリアルタイム連動
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

    onValue(ref(db, 'pen_light/last_command'), (snapshot) => {
        if (amIAdmin) return;
        const cmd = snapshot.val();
        if (!cmd) return;
        if (cmd.timestamp < lastMyTapTime) return;
        applyExternalCommand(cmd);
    });

    function applyExternalCommand(cmd) {
        clearEffectsUI();
        stopRainbowProcessor();
        btnOff.classList.remove('active');

        activeMode = cmd.mode;
        rainbowPattern = cmd.pattern || 'flash';
        btnPattern.innerText = (rainbowPattern === 'fade') ? '虹:滑らか' : '虹:一瞬';

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

    // イベント設定
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

    btnBlink.addEventListener('click', (e) => { e.stopPropagation(); toggleEffect('blink', btnBlink, 'effect-blink'); });
    btnPulse.addEventListener('click', (e) => { e.stopPropagation(); toggleEffect('pulse', btnPulse, 'effect-pulse'); });

    btnPattern.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isRainbow) return;
        rainbowPattern = (rainbowPattern === 'flash') ? 'fade' : 'flash';
        btnPattern.innerText = (rainbowPattern === 'fade') ? '虹:滑らか' : '虹:一瞬';
        stopRainbowProcessor();
        startRainbowProcessor();
        sendAdminCommand();
    });

    btnSync.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (amIAdmin) return;
        try {
            const snapshot = await get(ref(db, 'pen_light/last_command'));
            const cmd = snapshot.val();
            if (cmd) {
                lastMyTapTime = 0;
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

    // 初期化
    initColorBars();
    applyLightVisual();
});
