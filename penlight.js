document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const penlightHead = document.getElementById('penlightHead');
    const lightSection = document.getElementById('lightSection');
    const brightnessSlider = document.getElementById('brightness');
    const colorButtons = document.querySelectorAll('.color-btn');
    const blinkBtn = document.getElementById('blinkBtn');
    const pulseBtn = document.getElementById('pulseBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const offBtn = document.getElementById('offBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');

    // 状態管理
    let currentColor = '#FF0000';
    let currentBrightness = 1;
    let currentMode = 'solid'; // 'solid' | 'rainbow' | 'blink' | 'pulse' | 'off'
    let rainbowInterval = null;
    let wakeLock = null;

    // レインボー用のカラーシーケンス
    const rainbowColors = [
        '#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', 
        '#00FFFF', '#0000FF', '#8B00FF', '#FF69B4'
    ];
    let rainbowIndex = 0;

    // 初期化設定
    updateLightDisplay();

    // 1. 色変更イベント
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // アクティブクラスの切り替え
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            offBtn.classList.remove('active');

            if (btn.id === 'rainbowBtn') {
                startRainbowMode();
            } else {
                stopRainbowMode();
                currentColor = btn.getAttribute('data-color');
                if (currentMode === 'off') currentMode = 'solid';
                updateLightDisplay();
            }
        });
    });

    // 2. 明るさスライダー
    brightnessSlider.addEventListener('input', (e) => {
        currentBrightness = e.target.value / 100;
        document.documentElement.style.setProperty('--brightness-val', currentBrightness);
        
        // 0%の時は実質OFF状態にする
        if (currentBrightness === 0) {
            lightSection.style.backgroundColor = 'rgba(0,0,0,0)';
        } else {
            updateBgGlow();
        }
    });

    // 3. 点滅モード
    blinkBtn.addEventListener('click', () => {
        toggleSpecialMode('blink', blinkBtn, 'anim-blink');
    });

    // 4. 明滅モード
    pulseBtn.addEventListener('click', () => {
        toggleSpecialMode('pulse', pulseBtn, 'anim-pulse');
    });

    // 5. OFFボタン
    offBtn.addEventListener('click', () => {
        colorButtons.forEach(b => b.classList.remove('active'));
        clearModes();
        offBtn.classList.add('active');
        currentMode = 'off';
        
        penlightHead.style.setProperty('--current-color', '#222');
        penlightHead.style.boxShadow = 'none';
        lightSection.style.backgroundColor = '#000';
    });

    // 6. 全画面モード
    fullscreenBtn.addEventListener('click', enterFullscreenMode);
    exitFullscreenBtn.addEventListener('click', exitFullscreenMode);

    // --- ユーティリティ関数群 ---

    function updateLightDisplay() {
        if (currentMode === 'off') return;
        
        // CSS変数で色を流し込む
        penlightHead.style.setProperty('--current-color', currentColor);
        
        // アニメーション中やレインボー中も発光エフェクトが維持されるよう再適用
        if (currentMode !== 'rainbow') {
            penlightHead.style.boxShadow = `0 0 40px 10px ${currentColor}, 0 0 80px 30px ${currentColor}`;
        }
        updateBgGlow();
    }

    // 背景も薄く光らせる演出（不透明度12%程度）
    function updateBgGlow() {
        if (currentBrightness === 0 || currentMode === 'off') {
            lightSection.style.backgroundColor = '#000';
            return;
        }
        // hexをrgbに変換してalpha適用
        const rgb = hexToRgb(currentColor);
        if (rgb) {
            lightSection.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.12 * currentBrightness})`;
        }
    }

    function toggleSpecialMode(modeName, buttonEl, className) {
        if (currentMode === 'off') return;

        const wasActive = currentMode === modeName;
        clearModes();

        if (!wasActive) {
            currentMode = modeName;
            buttonEl.classList.add('active');
            penlightHead.classList.add(className);
        } else {
            currentMode = 'solid';
        }
        updateLightDisplay();
    }

    function startRainbowMode() {
        clearModes();
        currentMode = 'rainbow';
        
        rainbowInterval = setInterval(() => {
            currentColor = rainbowColors[rainbowIndex];
            penlightHead.style.setProperty('--current-color', currentColor);
            penlightHead.style.boxShadow = `0 0 40px 10px ${currentColor}, 0 0 80px 30px ${currentColor}`;
            updateBgGlow();
            
            rainbowIndex = (rainbowIndex + 1) % rainbowColors.length;
        }, 800); // 0.8秒ごとに滑らかに切り替え
    }

    function stopRainbowMode() {
        if (rainbowInterval) {
            clearInterval(rainbowInterval);
            rainbowInterval = null;
        }
    }

    function clearModes() {
        stopRainbowMode();
        penlightHead.classList.remove('anim-blink', 'anim-pulse');
        blinkBtn.classList.remove('active');
        pulseBtn.classList.remove('active');
        offBtn.classList.remove('active');
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // 7. 将来拡張：Wake Lock API (画面スリープ防止)
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn(`Wake Lock エラー: ${err.name}, ${err.message}`);
            }
        }
    }

    function releaseWakeLock() {
        if (wakeLock !== null) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    // 全画面切り替えのモック処理
    function enterFullscreenMode() {
        document.body.classList.add('is-fullscreen');
        requestWakeLock(); // 全画面時にスリープ防止を起動
    }

    function exitFullscreenMode() {
        document.body.classList.remove('is-fullscreen');
        releaseWakeLock(); // 解除
    }
});
