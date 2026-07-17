document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
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
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');

    // 基本ステレート
    let currentColor = '#FF0000';
    let currentColorName = '赤';
    let currentMode = 'solid'; // 'solid' | 'rainbow' | 'blink' | 'pulse' | 'off'
    let isLocked = false; // 虹色ロックのフラグ
    let rainbowInterval = null;

    const rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', '#00FFFF', '#0000FF', '#8B00FF', '#FF69B4'];
    let rainbowIndex = 0;

    // 初期化表示
    updateLightDisplay();

    // 1. 下部中央のピルボタンをタップ ➔ カラーポップアップを開く
    colorPickerTrigger.addEventListener('click', (e) => {
        e.stopPropagation(); // 発光エリアへのタップ連動（全画面化）を防ぐ
        colorPickerOverlay.classList.add('open');
    });

    // 2. ポップアップを閉じる処理
    closeSheetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        colorPickerOverlay.classList.remove('open');
    });
    colorPickerOverlay.addEventListener('click', (e) => {
        if (e.target === colorPickerOverlay) {
            colorPickerOverlay.classList.remove('open');
        }
    });

    // 3. カラーパレットの選択処理（虹色ロック＆黒解除ロジクス内蔵）
    colorButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const isRainbow = btn.id === 'rainbowBtn';
            const targetColor = btn.getAttribute('data-color');
            const targetName = btn.getAttribute('data-name');

            // 【ルール①】虹色ロック中の挙動
            if (isLocked) {
                // 黒ボタン（解除）が押された場合のみロック解除可能
                if (targetColor === '#050505') {
                    isLocked = false;
                    colorGrid.classList.remove('locked');
                    stopRainbowMode();
                    
                    // 通常の黒（消灯）状態へリセット
                    colorButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentColor = '#050505';
                    currentColorName = '黒 (通常モード)';
                    if (currentMode === 'off') currentMode = 'solid';
                    updateLightDisplay();
                }
                return; // 虹色中に他の色を押しても完全に無視
            }

            // 【ルール②】通常状態から「虹色」が選ばれた場合
            if (isRainbow) {
                isLocked = true;
                colorGrid.classList.add('locked'); // CSSで他のボタンを半透明＆無効化
                colorButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                startRainbowMode();
                return;
            }

            // 通常の単色切り替え
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (currentMode === 'off') currentMode = 'solid';
            currentColor = targetColor;
            currentColorName = targetName;
            
            updateLightDisplay();
        });
    });

    // 4. エフェクトモード切り替え
    blinkBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMode('blink', blinkBtn, 'anim-blink'); });
    pulseBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMode('pulse', pulseBtn, 'anim-pulse'); });
    
    offBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isLocked) return; // 虹色中はOFFもロック
        
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

    // 5. 画面タッチで全画面切り替え
    lightSection.addEventListener('click', () => {
        // ポップアップが開いている時は全画面化しない
        if (colorPickerOverlay.classList.contains('open')) return;

        if (!document.body.classList.contains('is-fullscreen')) {
            document.body.classList.add('is-fullscreen');
        } else {
            document.body.classList.remove('is-fullscreen');
        }
    });

    // 6. ページ切り替え（別タブ移行など）を検知して全画面を自動解除
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.body.classList.remove('is-fullscreen');
        }
    });

    // --- ロジック関数群 ---

    function updateLightDisplay() {
        if (currentMode === 'off') return;

        penlightHead.style.setProperty('--current-color', currentColor);
        
        // 黒（減光）状態と通常最高輝度状態のbox-shadow分岐
        if (currentColor === '#050505') {
            penlightHead.style.boxShadow = `0 0 15px 1px #151515`;
            lightSection.style.backgroundColor = '#000000';
        } else {
            penlightHead.style.boxShadow = `0 0 70px 20px ${currentColor}, 0 0 140px 50px ${currentColor}`;
            
            // 背景の環境光も画面いっぱいに追従
            const rgb = hexToRgb(currentColor);
            if (rgb) lightSection.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`;
        }
        
        updatePillDisplay();
    }

    // 中央下部ピルの表記をリフレッシュ
    function updatePillDisplay() {
        if (isLocked) {
            pillText.innerText = '🌈 虹色 (ロック中)';
            pillDot.style.background = 'linear-gradient(45deg, red, blue)';
        } else {
            pillText.innerText = `${currentColorName} ${currentMode !== 'solid' && currentMode !== 'off' ? `[${currentMode}]` : ''}`;
            document.documentElement.style.setProperty('--current-color', currentColor);
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
        }, 650); // スムーズかつ軽快なグラデーションテンポ
    }

    function stopRainbowMode() {
        if (rainbowInterval) {
            clearInterval(rainbowInterval);
            rainbowInterval = null;
        }
    }

    function toggleMode(modeName, element, className) {
        if (currentMode === 'off' || isLocked) return; // 虹色ロック中はエフェクト変更不可
        
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
