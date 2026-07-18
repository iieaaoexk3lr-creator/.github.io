document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('appContainer');
    const penlightBody = document.getElementById('penlightBody');
    const lightField = document.getElementById('lightField');
    const leftBar = document.querySelector('.left-bar');
    const rightBar = document.querySelector('.right-bar');
    
    const btnBlink = document.getElementById('btnBlink');
    const btnPulse = document.getElementById('btnPulse');
    const btnPattern = document.getElementById('btnPattern');
    const btnHide = document.getElementById('btnHide');
    const btnOff = document.getElementById('btnOff');

    // カラーリスト定義
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

    // アプリの状態管理変数
    let activeColor = '#FF0000'; 
    let activeMode = 'solid'; // 'solid', 'blink', 'pulse', 'off'
    let isRainbow = false;
    let rainbowPattern = 'flash'; // 'flash'(一瞬) または 'fade'(滑らか)
    
    let rainbowTimer = null;
    let uiHidden = false;
    let fadeIndex = 0;

    // 1. 左右の縦バーにカラーボタンを自動生成（両利き同期システム）
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

                // 初期のアクティブカラー（赤）にクラス付与
                if (preset.hex === activeColor) btn.classList.add('active');

                // タップ・クリックイベント
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 発光エリアのイベント連動を阻止
                    changeColor(preset.hex);
                });

                bar.appendChild(btn);
            });
        });
    }

    // 2. 色切り替え処理（ロック無し、いつでも上書き可能）
    function changeColor(colorCode) {
        // OFFモードだったら通常点灯モードに引き戻す
        if (activeMode === 'off') activeMode = 'solid';
        btnOff.classList.remove('active');

        // 虹色タイマーが走っていたら一旦完全停止
        stopRainbowProcessor();

        if (colorCode === 'rainbow') {
            isRainbow = true;
            btnPattern.disabled = false; // パターン選択を有効化
            startRainbowProcessor();
        } else {
            isRainbow = false;
            activeColor = colorCode;
            btnPattern.disabled = true; // 通常色はパターン選択を無効化
            applyLightVisual();
        }

        // 左右のボタンの「アクティブ状態」を完全同期
        document.querySelectorAll('.c-cell').forEach(btn => {
            if (btn.getAttribute('data-color') === colorCode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // 3. 虹色処理エンジン（フラッシュ / フェード）
    function startRainbowProcessor() {
        let step = 0;
        penlightBody.style.transition = 'box-shadow 0.2s ease, background 0.2s ease';

        if (rainbowPattern === 'flash') {
            // パターンA: パッパッと切り替わる
            rainbowTimer = setInterval(() => {
                activeColor = rainbowSequence[step];
                applyLightVisual();
                step = (step + 1) % rainbowSequence.length;
            }, 600);
        } else {
            // パターンB: じわ〜っと滑らかにグラデーション
            penlightBody.style.transition = 'background 2.0s linear, box-shadow 2.0s linear';
            activeColor = rainbowSequence[fadeIndex];
            applyLightVisual();
            
            rainbowTimer = setInterval(() => {
                fadeIndex = (fadeIndex + 1) % rainbowSequence.length;
                activeColor = rainbowSequence[fadeIndex];
                applyLightVisual();
            }, 2000); // 2秒かけて次の色へ滑らかに変貌
        }
    }

    function stopRainbowProcessor() {
        if (rainbowTimer) {
            clearInterval(rainbowTimer);
            rainbowTimer = null;
        }
    }

    // 4. 発光色・グラデーションのCSS反映
    function applyLightVisual() {
        if (activeMode === 'off') return;
        penlightBody.style.setProperty('--pen-color', activeColor);
    }

    // 5. 特殊エフェクトモードの切り替え（点滅・明滅）
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
    }

    function clearEffectsUI() {
        penlightBody.classList.remove('effect-blink', 'effect-pulse');
        btnBlink.classList.remove('active');
        btnPulse.classList.remove('active');
    }

    // --- 各種ボタンイベントリスナー ---

    // 点滅ボタン
    btnBlink.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleEffect('blink', btnBlink, 'effect-blink');
    });

    // 明滅ボタン
    btnPulse.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleEffect('pulse', btnPulse, 'effect-pulse');
    });

    // 虹パターン切り替えボタン
    btnPattern.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isRainbow) return;

        if (rainbowPattern === 'flash') {
            rainbowPattern = 'fade';
            btnPattern.innerText = '虹パターン: 滑らか';
        } else {
            rainbowPattern = 'flash';
            btnPattern.innerText = '虹パターン: 一瞬';
        }
        // タイマーを新パターンで再起動
        stopRainbowProcessor();
        startRainbowProcessor();
    });

    // 非表示（UI隠し）ボタン
    btnHide.addEventListener('click', (e) => {
        e.stopPropagation();
        uiHidden = true;
        appContainer.classList.add('ui-hidden');
    });

    // OFFボタン
    btnOff.addEventListener('click', (e) => {
        e.stopPropagation();
        stopRainbowProcessor();
        clearEffectsUI();
        document.querySelectorAll('.c-cell').forEach(b => b.classList.remove('active'));
        
        activeMode = 'off';
        isRainbow = false;
        btnPattern.disabled = true;
        btnOff.classList.add('active');

        // ライトを完全消灯（真っ黒）に
        penlightBody.style.setProperty('--pen-color', '#000000');
        penlightBody.style.boxShadow = 'none';
    });

    // 6. 【コアロジック】中央エリアタップ時の挙動（全画面化 ＆ UI復帰）
    lightField.addEventListener('click', () => {
        // もしボタン類が非表示状態なら、全画面化は弄らずに「UIの復帰」だけを行う
        if (uiHidden) {
            uiHidden = false;
            appContainer.classList.remove('ui-hidden');
            return;
        }

        // UIが表示されている通常の時は、ブラウザの本物の全画面モードをトグル
        if (!document.fullscreenElement) {
            appContainer.requestFullscreen().catch(err => {
                console.log(`全画面切り替えエラー: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // スマホのタブ切り替え時などに全画面を安全に解除するセキュリティ策
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && document.fullscreenElement) {
            document.exitFullscreen();
        }
    });

    // アプリ起動
    initColorBars();
    applyLightVisual();
});
