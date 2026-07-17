document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const penlightHead = document.getElementById('penlightHead');
    const lightSection = document.getElementById('lightSection');
    const colorButtons = document.querySelectorAll('.color-btn');
    const blinkBtn = document.getElementById('blinkBtn');
    const pulseBtn = document.getElementById('pulseBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const offBtn = document.getElementById('offBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');

    // 状態管理
    let currentColor = '#FF0000';
    let currentMode = 'solid'; // 'solid' | 'rainbow' | 'blink' | 'pulse' | 'off'
    let rainbowInterval = null;
    let wakeLock = null;

    // 自動レインボー用のデフォルト配列
    const rainbowColors = [
        '#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', 
        '#00FFFF', '#0000FF', '#8B00FF', '#FF69B4'
    ];
    let rainbowIndex = 0;

    // 各カラーボタンのアクティブ光設定
    colorButtons.forEach(btn => {
        const col = btn.getAttribute('data-color');
        if (col) btn.style.setProperty('--btn-glow-color', col);
    });

    // 初期化
    updateLightDisplay();

    // 1. 色変更・レインボー手動選択イベント
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const isRainbowClick = btn.id === 'rainbowBtn';
            
            // OFF状態なら通常復帰
            if (currentMode === 'off') currentMode = 'solid';

            if (isRainbowClick) {
                // レインボーを選択した場合（自動ループ開始）
                colorButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                offBtn.classList.remove('active');
                startRainbowMode();
            } else {
                const targetColor = btn.getAttribute('data-color');

                if (currentMode === 'rainbow') {
                    // ★【新仕様】レインボー中に色を選ぶと、その指定色を次の変化ベースにする
                    currentColor = targetColor;
                    updateLightDisplay();
                    
                    // タップした単色ボタンを一瞬光らせる視覚フィードバック
                    btn.classList.add('active');
                    setTimeout(() => {
                        if (currentMode === 'rainbow') btn.classList.remove('active');
                    }, 300);
                } else {
                    // 通常の単色切り替え
                    colorButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    offBtn.classList.remove('active');
                    
                    stopRainbowMode();
                    currentColor = targetColor;
                    updateLightDisplay(); // 周りの光も即座に切り替えを保証
                }
            }
        });
    });

    // 2. 点滅モード
    blinkBtn.addEventListener('click', () => {
        toggleSpecialMode('blink', blinkBtn, 'anim-blink');
    });

    // 3. 明滅モード
    pulseBtn.addEventListener('click', () => {
        toggleSpecialMode('pulse', pulseBtn, 'anim-pulse');
    });

    // 4. OFFボタン（完全消灯）
    offBtn.addEventListener('click', () => {
        colorButtons.forEach(b => b.classList.remove('active'));
        clearModes();
        offBtn.classList.add('active');
        currentMode = 'off';
        
        penlightHead.style.setProperty('--current-color', '#000000');
        penlightHead.style.boxShadow = 'none';
        lightSection.style.backgroundColor = '#000000';
    });

    // 5. 全画面モード
    fullscreenBtn.addEventListener('click', enterFullscreenMode);
    exitFullscreenBtn.addEventListener('click', exitFullscreenMode);


    // --- 内部処理ロジック群 ---

    // 画面発光の完全同期アップデート
    function updateLightDisplay() {
        if (currentMode === 'off') return;
        
        // メインライト部分のカラー変数更新
        penlightHead.style.setProperty('--current-color', currentColor);
        
        // 通常色切り替え時もエフェクトが確実に追従するよう、box-shadowをリアルタイム生成
        if (currentColor === '#050505') {
            // ⚫ 黒ボタンのときは超減光・微かなダークグロー表現
            penlightHead.style.boxShadow = `0 0 15px 2px #111`;
        } else {
            // 通常カラーは最高輝度の爆光Glow
            penlightHead.style.boxShadow = `0 0 60px 15px ${currentColor}, 0 0 120px 40px ${currentColor}`;
        }
        
        // 周りを囲む光（背景）の更新
        updateBgGlow();
    }

    // 周りを囲む光を画面いっぱいに広げる処理（不透明度の最適化）
    function updateBgGlow() {
        if (currentMode === 'off') {
            lightSection.style.backgroundColor = '#000000';
            return;
        }

        if (currentColor === '#050505') {
            // 黒選択時は周りも真っ黒にする
            lightSection.style.backgroundColor = '#000000';
            return;
        }

        const rgb = hexToRgb(currentColor);
        if (rgb) {
            // 画面全体を包むため、以前より少し不透明度を高め(16%)にして空間を光で満たす
            lightSection.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`;
        }
    }

    function toggleSpecialMode(modeName, buttonEl, className) {
        if (currentMode === 'off') return;

        const wasActive = currentMode === modeName;
        const previousColor = currentColor;
        
        clearModes();

        if (!wasActive) {
            currentMode = modeName;
            buttonEl.classList.add('active');
            penlightHead.classList.add(className);
        } else {
            currentMode = 'solid';
        }
        currentColor = previousColor;
        updateLightDisplay();
    }

    // レインボームープの制御
    function startRainbowMode() {
        if (rainbowInterval) clearInterval(rainbowInterval);
        currentMode = 'rainbow';
        
        rainbowInterval = setInterval(() => {
            // レインボー中に個別タップされていなければ、自動サイクルを継続
            if (currentMode === 'rainbow') {
                currentColor = rainbowColors[rainbowIndex];
                updateLightDisplay();
                rainbowIndex = (rainbowIndex + 1) % rainbowColors.length;
            }
        }, 700); // 軽快に切り替わるスピード
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

    // スリープ防止 (Wake Lock API) 制御
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
        }
    }
    function releaseWakeLock() {
        if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }
    }

    function enterFullscreenMode() {
        document.body.classList.add('is-fullscreen');
        requestWakeLock();
    }
    function exitFullscreenMode() {
        document.body.classList.remove('is-fullscreen');
        releaseWakeLock();
        updateLightDisplay(); // 復帰時にも色ズレが起きないよう再描画
    }
});
