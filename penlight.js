document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('fullscreenContainer');
    const penlightHead = document.getElementById('penlightHead');
    const lightSection = document.getElementById('lightSection');
    const colorPickerOverlay = document.getElementById('colorPickerOverlay');
    const colorPickerTrigger = document.getElementById('colorPickerTrigger');
    const colorGrid = document.getElementById('colorGrid');
    const colorButtons = document.querySelectorAll('.color-btn');
    const pillText = document.getElementById('pillText');
    const pillDot = document.getElementById('pillDot');
    
    const blinkBtn = document.getElementById('blinkBtn');
    const pulseBtn = document.getElementById('pulseBtn');
    const offBtn = document.getElementById('offBtn');
    const closeSheetBtn = document.getElementById('closeSheetBtn');

    // 内部ステート
    let currentColor = '#FF0000';
    let currentColorName = '赤';
    let currentMode = 'solid'; 
    let isLocked = false; 
    let rainbowInterval = null;

    const rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', '#00FFFF', '#0000FF', '#8B00FF', '#FF69B4'];
    let rainbowIndex = 0;

    updateLightDisplay();

    // 1. 色選択ポップアップの開閉
    colorPickerTrigger.addEventListener('click', (e) => {
        e.stopPropagation(); // 発光エリアの全画面化クリックイベント連動を防ぐ
        colorPickerOverlay.classList.add('open');
    });

    closeSheetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        colorPickerOverlay.classList.remove('open');
    });

    // 2. カラーパレット制御（虹色ロック＆黒解除ロジック）
    colorButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isRainbow = btn.id === 'rainbowBtn';
            const targetColor = btn.getAttribute('data-color');
            const targetName = btn.getAttribute('data-name');

            // 虹色ロック中の判定
            if (isLocked) {
                if (targetColor === '#050505') { // 黒が選ばれたらロック解除
                    isLocked = false;
                    colorGrid.classList.remove('locked');
                    stopRainbowMode();
                    
                    colorButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentColor = '#050505';
                    currentColorName = '黒 (通常モードへ復帰)';
                    if (currentMode === 'off') currentMode = 'solid';
                    updateLightDisplay();
                }
                return;
            }

            // 通常時から虹色モードへの移行
            if (isRainbow) {
                isLocked = true;
                colorGrid.classList.add('locked');
                colorButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                startRainbowMode();
                return;
            }

            // 通常の単色変更
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (currentMode === 'off') currentMode = 'solid';
            currentColor = targetColor;
            currentColorName = targetName;
            updateLightDisplay();
        });
    });

    // 3. エフェクト設定
    blinkBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMode('blink', blinkBtn, 'anim-blink'); });
    pulseBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMode('pulse', pulseBtn, 'anim-pulse'); });
    
    offBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isLocked) return;
        colorButtons.forEach(b => b.classList.remove('active'));
        clearAllAnims();
        offBtn.classList.add('active');
        currentMode = 'off';
        currentColorName = '消灯';
        
        penlightHead.style.setProperty('--current-color', '#000000');
        penlightHead.style.boxShadow = 'none';
        lightSection.style.backgroundColor = '#000000';
        updatePillDisplay();
    });

    // 4. 【本物の全画面表示】画面タッチでブラウザのURLバー・ナビゲーションを隠す
    lightSection.addEventListener('click', () => {
        if (colorPickerOverlay.classList.contains('open')) return;

        // すでに全画面表示中なら解除、そうでなければ全画面を要求
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log(`全画面エラー: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // 5. ページ非表示・タブ切り替え時に全画面モードを自動で元に戻す
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && document.fullscreenElement) {
            document.exitFullscreen();
        }
    });

    // --- 各種ビジュアル処理ロジック ---

    function updateLightDisplay() {
        if (currentMode === 'off') return;
        penlightHead.style.setProperty('--current-color', currentColor);
        
        if (currentColor === '#050505') {
            penlightHead.style.boxShadow = `0 0 15px 1px #111`;
            lightSection.style.backgroundColor = '#000000';
        } else {
            penlightHead.style.boxShadow = `0 0 60px 15px ${currentColor}, 0 0 120px 35px ${currentColor}`;
            const rgb = hexToRgb(currentColor);
            if (rgb) lightSection.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`;
        }
        updatePillDisplay();
    }

    function updatePillDisplay() {
        if (isLocked) {
            pillText.innerText = '🌈 虹色 (ロック中)';
            pillDot.style.background = 'linear-gradient(45deg, red, blue)';
        } else {
            pillText.innerText = `${currentColorName} ${currentMode !== 'solid' && currentMode !== 'off' ? `[${currentMode}]` : ''}`;
            pillDot.style.background = currentColor;
        }
    }

    function startRainbowMode() {
        if (rainbowInterval) clearInterval(rainbowInterval);
        currentMode = 'rainbow';
        rainbowInterval = setInterval(() => {
            if (isLocked) {
                currentColor = rainbowColors[rainbowIndex];
                updateLightDisplay();
                rainbowIndex = (rainbowIndex + 1) % rainbowColors.length;
            }
        }, 650);
    }

    function stopRainbowMode() {
        if (rainbowInterval) {
            clearInterval(rainbowInterval);
            rainbowInterval = null;
        }
    }

    function toggleMode(modeName, element, className) {
        if (currentMode === 'off' || isLocked) return;
        const isActive = currentMode === modeName;
        const prevCol = currentColor;
        clearAllAnims();

        if (!isActive) {
            currentMode = modeName;
            element.classList.add('active');
            penlightHead.classList.add(className);
        } else {
            currentMode = 'solid';
        }
        currentColor = prevCol;
        updateLightDisplay();
    }

    function clearAllAnims() {
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
});
