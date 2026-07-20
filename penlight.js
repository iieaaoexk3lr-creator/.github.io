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

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 自分の匿名ユーザーIDをランダムに生成
const myUserId = "user_" + Math.random().toString(36).substring(2, 10);

// カラーパレット定義（18色）
const COLOR_PALETTE = [
    { name: "レッド", hex: "#ff0000" },
    { name: "ピンク", hex: "#ff1493" },
    { name: "ローズ", hex: "#ff6699" },
    { name: "ライトピンク", hex: "#ffb6c1" },
    { name: "オレンジ", hex: "#ff4500" },
    { name: "ヤマブキ", hex: "#ff8c00" },
    { name: "イエロー", hex: "#ffff00" },
    { name: "ライトグリーン", hex: "#7fff00" },
    { name: "グリーン", hex: "#00ff00" },
    { name: "エメラルド", hex: "#00fa9a" },
    { name: "シアン", hex: "#00ffff" },
    { name: "ライトブルー", hex: "#87cefa" },
    { name: "ブルー", hex: "#0000ff" },
    { name: "パープル", hex: "#8a2be2" },
    { name: "バイオレット", hex: "#9400d3" },
    { name: "マゼンタ", hex: "#ff00ff" },
    { name: "ホワイト", hex: "#ffffff" },
    { name: "ウォームホワイト", hex: "#fff8dc" }
];

let amIAdmin = false;
let isOff = false;
let currentMode = 'normal'; // 'normal', 'blink', 'pulse'
let lastColor = "#ff0000";

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素取得
    const appContainer = document.getElementById('appContainer');
    const penlightBody = document.getElementById('penlightBody');
    const lightField = document.getElementById('lightField');
    const leftBar = document.querySelector('.left-bar');
    const rightBar = document.querySelector('.right-bar');
    const modeText = document.getElementById('modeText'); // 旧statusBadgeの差し替え

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

    // 左右カラーバーの動的生成
    function createColorBars() {
        leftBar.innerHTML = '';
        rightBar.innerHTML = '';
        const half = Math.ceil(COLOR_PALETTE.length / 2);

        COLOR_PALETTE.forEach((colorObj, index) => {
            const btn = document.createElement('button');
            btn.className = 'color-pick-btn';
            btn.style.backgroundColor = colorObj.hex;
            btn.title = colorObj.name;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setColor(colorObj.hex);
            });

            if (index < half) {
                leftBar.appendChild(btn);
            } else {
                rightBar.appendChild(btn);
            }
        });
    }
    createColorBars();

    // 色設定関数
    function setColor(colorHex, isBroadcast = true) {
        lastColor = colorHex;
        if (isOff) {
            turnOn();
        }
        document.documentElement.style.setProperty('--pen-color', colorHex);

        if (isBroadcast && amIAdmin) {
            set(ref(db, 'pen_light/state/color'), colorHex);
        }
    }

    // ON/OFF 処理
    function turnOff(isBroadcast = true) {
        isOff = true;
        penlightBody.classList.add('pen-off');
        btnOff.classList.add('active');
        if (isBroadcast && amIAdmin) {
            set(ref(db, 'pen_light/state/isOff'), true);
        }
    }

    function turnOn(isBroadcast = true) {
        isOff = false;
        penlightBody.classList.remove('pen-off');
        btnOff.classList.remove('active');
        if (isBroadcast && amIAdmin) {
            set(ref(db, 'pen_light/state/isOff'), false);
        }
    }

    btnOff.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isOff) {
            turnOn();
        } else {
            turnOff();
        }
    });

    // モード切替（Normal, Blink, Pulse）
    function setMode(mode, isBroadcast = true) {
        currentMode = mode;
        penlightBody.classList.remove('mode-blink', 'mode-pulse');
        btnBlink.classList.remove('active');
        btnPulse.classList.remove('active');

        if (mode === 'blink') {
            penlightBody.classList.add('mode-blink');
            btnBlink.classList.add('active');
        } else if (mode === 'pulse') {
            penlightBody.classList.add('mode-pulse');
            btnPulse.classList.add('active');
        }

        if (isBroadcast && amIAdmin) {
            set(ref(db, 'pen_light/state/mode'), mode);
        }
    }

    btnBlink.addEventListener('click', (e) => {
        e.stopPropagation();
        setMode(currentMode === 'blink' ? 'normal' : 'blink');
    });

    btnPulse.addEventListener('click', (e) => {
        e.stopPropagation();
        setMode(currentMode === 'pulse' ? 'normal' : 'pulse');
    });

    // スライダー変更イベント
    rangeGlow.addEventListener('input', (e) => {
        const val = e.target.value;
        valGlow.innerText = val;
        applyGlow(val);
        if (amIAdmin) set(ref(db, 'pen_light/state/glow'), parseFloat(val));
    });

    rangeBright.addEventListener('input', (e) => {
        const val = e.target.value;
        valBright.innerText = val;
        applyBright(val);
        if (amIAdmin) set(ref(db, 'pen_light/state/bright'), parseInt(val));
    });

    rangeSpeed.addEventListener('input', (e) => {
        const val = e.target.value;
        valSpeed.innerText = val;
        applySpeed(val);
        if (amIAdmin) set(ref(db, 'pen_light/state/speed'), parseFloat(val));
    });

    function applyGlow(val) {
        document.documentElement.style.setProperty('--pen-glow', val);
    }
    function applyBright(val) {
        penlightBody.style.filter = `brightness(${val}%)`;
    }
    function applySpeed(val) {
        const duration = 1 / parseFloat(val);
        document.documentElement.style.setProperty('--anim-duration', `${duration}s`);
    }

    // UI非表示（隠すボタン / 全画面化）
    btnHide.addEventListener('click', (e) => {
        e.stopPropagation();
        appContainer.classList.add('ui-hidden');
    });

    lightField.addEventListener('click', () => {
        if (appContainer.classList.contains('ui-hidden')) {
            appContainer.classList.remove('ui-hidden');
        } else {
            // フルスクリーン切替
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
            }
        }
    });

    // 同期ボタン
    btnSync.addEventListener('click', (e) => {
        e.stopPropagation();
        get(ref(db, 'pen_light/state')).then((snapshot) => {
            if (snapshot.exists()) {
                applyState(snapshot.val());
            }
        });
    });

    // 管理者スイッチ切替
    adminToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            set(ref(db, 'pen_light/active_admin_id'), myUserId);
        } else {
            get(ref(db, 'pen_light/active_admin_id')).then((snapshot) => {
                if (snapshot.val() === myUserId) {
                    set(ref(db, 'pen_light/active_admin_id'), null);
                }
            });
        }
    });

    // Firebaseリアルタイム同期受診
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

    onValue(ref(db, 'pen_light/state'), (snapshot) => {
        if (snapshot.exists() && !amIAdmin) {
            applyState(snapshot.val());
        }
    });

    function applyState(state) {
        if (!state) return;
        if (state.color) setColor(state.color, false);
        if (state.mode) setMode(state.mode, false);
        if (typeof state.isOff === 'boolean') {
            if (state.isOff) turnOff(false); else turnOn(false);
        }
        if (state.glow !== undefined) {
            rangeGlow.value = state.glow;
            valGlow.innerText = state.glow;
            applyGlow(state.glow);
        }
        if (state.bright !== undefined) {
            rangeBright.value = state.bright;
            valBright.innerText = state.bright;
            applyBright(state.bright);
        }
        if (state.speed !== undefined) {
            rangeSpeed.value = state.speed;
            valSpeed.innerText = state.speed;
            applySpeed(state.speed);
        }
    }

    // 初期カラー設定
    setColor("#ff0000", false);
});
