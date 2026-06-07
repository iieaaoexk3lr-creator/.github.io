// =====================================
// DOM
// =====================================

const video =
document.getElementById("video");

const auraCanvas =
document.getElementById("auraCanvas");

const auraCtx =
auraCanvas.getContext("2d");

const recordCanvas =
document.getElementById("recordCanvas");

const recordCtx =
recordCanvas.getContext("2d");

const resultCanvas =
document.getElementById("resultCanvas");

const resultCtx =
resultCanvas.getContext("2d");

const startBtn =
document.getElementById("startBtn");

const stopBtn =
document.getElementById("stopBtn");

const retryBtn =
document.getElementById("retryBtn");

const saveResultBtn =
document.getElementById("saveResultBtn");

const saveSummaryBtn =
document.getElementById("saveSummaryBtn");

const saveVideoBtn =
document.getElementById("saveVideoBtn");

const playerNameInput =
document.getElementById("playerName");

const showPowerEl =
document.getElementById("showPower");

const attributeNameEl =
document.getElementById("attributeName");

const resultNameEl =
document.getElementById("resultName");

const resultAttributeEl =
document.getElementById("resultAttribute");

const resultTitleEl =
document.getElementById("resultTitle");

const resultPowerEl =
document.getElementById("resultPower");

const shot1 =
document.getElementById("shot1");

const shot2 =
document.getElementById("shot2");

const shot3 =
document.getElementById("shot3");


// =====================================
// 状態管理
// =====================================

let recording = false;

let cameraStream = null;
let microphoneStream = null;

let poseLandmarker = null;

let mediaRecorder = null;

let recordedChunks = [];

let lastVideoTime = -1;

let currentAttribute = "冷静";

let currentTitle = "";

let currentShowPower = 0;

let maxShowPower = 0;

let pitchScore = 0;

let travelDistance = 0;

let previousCenter = null;

let topShots = [];


// =====================================
// オーラ色
// =====================================

const auraColors = {

  熱血:"#ff4444",

  元気:"#44ff66",

  冷静:"#4da6ff",

  コミカル:"#ffd93d",

  妖艶:"#c066ff",

  カリスマ:"#333333",

  歌うま:"#ffffff",

  歌神:"#ffd700"

};


// =====================================
// モーション集計
// =====================================

let motionStats = {

  head:0,

  elbow:0,

  wrist:0,

  hip:0,

  knee:0

};


// =====================================
// 現在のPose
// =====================================

let posePoints = {

  head:null,

  leftElbow:null,
  rightElbow:null,

  leftWrist:null,
  rightWrist:null,

  leftHip:null,
  rightHip:null,

  leftKnee:null,
  rightKnee:null

};


// =====================================
// 前フレームPose
// =====================================

let previousPoints = {

  head:null,

  leftElbow:null,
  rightElbow:null,

  leftWrist:null,
  rightWrist:null,

  leftHip:null,
  rightHip:null,

  leftKnee:null,
  rightKnee:null

};


// =====================================
// 音符演出
// =====================================

let noteRotation = 0;


// =====================================
// Canvasサイズ
// =====================================

function resizeCanvas(){

  const width =
    video.clientWidth;

  const height =
    video.clientHeight;

  auraCanvas.width =
    width;

  auraCanvas.height =
    height;

  recordCanvas.width =
    width;

  recordCanvas.height =
    height;

}

window.addEventListener(
  "resize",
  resizeCanvas
);


// =====================================
// 背面カメラ
// =====================================

async function startCamera(){

  cameraStream =
    await navigator.mediaDevices
    .getUserMedia({

      video:{

        facingMode:{
          ideal:"environment"
        },

        width:{
          ideal:1280
        },

        height:{
          ideal:720
        }

      },

      audio:false

    });

  video.srcObject =
    cameraStream;

  await video.play();

  resizeCanvas();

}


// =====================================
// マイク
// =====================================

let audioContext;

let analyser;

let frequencyData;

async function startMicrophone(){

  microphoneStream =
    await navigator.mediaDevices
    .getUserMedia({

      audio:true

    });

  audioContext =
    new AudioContext();

  const source =

    audioContext
    .createMediaStreamSource(
      microphoneStream
    );

  analyser =
    audioContext
    .createAnalyser();

  analyser.fftSize =
    2048;

  source.connect(
    analyser
  );

  frequencyData =
    new Uint8Array(
      analyser.frequencyBinCount
    );

}


// =====================================
// 音声更新
// =====================================

function updateAudio(){

  if(!analyser)
    return;

  analyser.getByteFrequencyData(
    frequencyData
  );

  let total = 0;

  for(
    let i=0;
    i<frequencyData.length;
    i++
  ){

    total +=
      frequencyData[i];

  }

  pitchScore =
    total /
    frequencyData.length;

}


// =====================================
// MediaPipe Pose
// =====================================

async function initializePose(){

  const visionModule =
    await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"
    );

  const {
    PoseLandmarker,
    FilesetResolver
  } = visionModule;

  const vision =

    await FilesetResolver
    .forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

  poseLandmarker =

    await PoseLandmarker
    .createFromOptions(

      vision,

      {

        baseOptions:{

          modelAssetPath:
"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"

        },

        runningMode:"VIDEO",

        numPoses:1

      }

    );

}


// =====================================
// 録画開始
// =====================================

startBtn.addEventListener(
  "click",
  startRecordingSession
);

async function startRecordingSession(){

  if(recording)
    return;

  recording = true;

  startBtn.disabled = true;

  stopBtn.disabled = false;

  retryBtn.disabled = true;

  saveResultBtn.disabled = true;

  saveSummaryBtn.disabled = true;

  saveVideoBtn.disabled = true;

  resetSessionData();

  await startCamera();

  await startMicrophone();

  await initializePose();

  startRecorder();

  requestAnimationFrame(
    detectPoseLoop
  );

}

// =====================================
// 距離計算
// =====================================

function distance(a,b){

  if(!a || !b)
    return 0;

  const dx =
    a.x - b.x;

  const dy =
    a.y - b.y;

  return Math.hypot(
    dx,
    dy
  );

}


// =====================================
// Pose検出ループ
// =====================================

async function detectPoseLoop(){

  if(!recording)
    return;

  if(
    !poseLandmarker ||
    !video.videoWidth
  ){

    requestAnimationFrame(
      detectPoseLoop
    );

    return;
  }

  const now =
    performance.now();

  if(
    video.currentTime !==
    lastVideoTime
  ){

    lastVideoTime =
      video.currentTime;

    const result =

      poseLandmarker
      .detectForVideo(
        video,
        now
      );

    if(
      result.landmarks &&
      result.landmarks.length
    ){

      processPose(
        result.landmarks[0]
      );

    }

  }

  requestAnimationFrame(
    detectPoseLoop
  );

}


// =====================================
// Pose処理
// =====================================

function processPose(points){

  const w =
    auraCanvas.width;

  const h =
    auraCanvas.height;

  posePoints.head = {

    x:points[0].x*w,
    y:points[0].y*h

  };

  posePoints.leftElbow = {

    x:points[13].x*w,
    y:points[13].y*h

  };

  posePoints.rightElbow = {

    x:points[14].x*w,
    y:points[14].y*h

  };

  posePoints.leftWrist = {

    x:points[15].x*w,
    y:points[15].y*h

  };

  posePoints.rightWrist = {

    x:points[16].x*w,
    y:points[16].y*h

  };

  posePoints.leftHip = {

    x:points[23].x*w,
    y:points[23].y*h

  };

  posePoints.rightHip = {

    x:points[24].x*w,
    y:points[24].y*h

  };

  posePoints.leftKnee = {

    x:points[25].x*w,
    y:points[25].y*h

  };

  posePoints.rightKnee = {

    x:points[26].x*w,
    y:points[26].y*h

  };

  updateMovement();

}


// =====================================
// 移動量集計
// =====================================

function updateMovement(){

  motionStats.head +=

    distance(
      posePoints.head,
      previousPoints.head
    );

  motionStats.elbow +=

    distance(
      posePoints.leftElbow,
      previousPoints.leftElbow
    ) +

    distance(
      posePoints.rightElbow,
      previousPoints.rightElbow
    );

  motionStats.wrist +=

    distance(
      posePoints.leftWrist,
      previousPoints.leftWrist
    ) +

    distance(
      posePoints.rightWrist,
      previousPoints.rightWrist
    );

  motionStats.hip +=

    distance(
      posePoints.leftHip,
      previousPoints.leftHip
    ) +

    distance(
      posePoints.rightHip,
      previousPoints.rightHip
    );

  motionStats.knee +=

    distance(
      posePoints.leftKnee,
      previousPoints.leftKnee
    ) +

    distance(
      posePoints.rightKnee,
      previousPoints.rightKnee
    );

  updateTravelDistance();

  saveCurrentPose();

}


// =====================================
// 人物移動距離
// =====================================

function updateTravelDistance(){

  const center = {

    x:
      (
        posePoints.head.x +

        posePoints.leftHip.x +
        posePoints.rightHip.x +

        posePoints.leftKnee.x +
        posePoints.rightKnee.x
      ) / 5,

    y:
      (
        posePoints.head.y +

        posePoints.leftHip.y +
        posePoints.rightHip.y +

        posePoints.leftKnee.y +
        posePoints.rightKnee.y
      ) / 5

  };

  if(previousCenter){

    travelDistance +=

      distance(
        center,
        previousCenter
      );

  }

  previousCenter =
    center;

}


// =====================================
// 前フレーム保存
// =====================================

function saveCurrentPose(){

  previousPoints = {

    head:
      posePoints.head,

    leftElbow:
      posePoints.leftElbow,

    rightElbow:
      posePoints.rightElbow,

    leftWrist:
      posePoints.leftWrist,

    rightWrist:
      posePoints.rightWrist,

    leftHip:
      posePoints.leftHip,

    rightHip:
      posePoints.rightHip,

    leftKnee:
      posePoints.leftKnee,

    rightKnee:
      posePoints.rightKnee

  };

}


// =====================================
// 歌Show力
// =====================================

function calculateShowPower(){

  updateAudio();

  const motionTotal =

    motionStats.head +
    motionStats.elbow +
    motionStats.wrist +
    motionStats.hip +
    motionStats.knee;

  currentShowPower = Math.floor(

      motionTotal * 2.5 +

      travelDistance * 3 +

      pitchScore * 40

  );

  if(
    currentShowPower >
    maxShowPower
  ){

    maxShowPower =
      currentShowPower;

    captureTopShot();

  }

  showPowerEl.textContent =

    currentShowPower
    .toLocaleString();

}


// =====================================
// 属性判定
// =====================================

function determineAttribute(){

  const totalMovement =

    motionStats.head +
    motionStats.elbow +
    motionStats.wrist +
    motionStats.hip +
    motionStats.knee;

  const handMovement =
    motionStats.wrist;

  const headMovement =
    motionStats.head;

  if(
    maxShowPower > 90000 &&
    pitchScore > 80 &&
    totalMovement > 300
  ){
    return "歌神";
  }

  if(
    pitchScore > 80
  ){
    return "歌うま";
  }

  if(
    totalMovement < 30
  ){
    return "カリスマ";
  }

  if(
    handMovement >
    totalMovement * 0.40
  ){
    return "妖艶";
  }

  if(
    headMovement >
    totalMovement * 0.35
  ){
    return "コミカル";
  }

  if(
    totalMovement > 500 &&
    travelDistance > 200
  ){
    return "元気";
  }

  if(
    totalMovement > 400 &&
    travelDistance < 100
  ){
    return "熱血";
  }

  return "冷静";

}


// =====================================
// 属性更新
// =====================================

setInterval(()=>{

  if(!recording)
    return;

  currentAttribute =
    determineAttribute();

  attributeNameEl.textContent =
    currentAttribute;

},10000);

// =====================================
// オーラ中心座標
// =====================================

function getAuraCenter(){

  if(
    !posePoints.head ||
    !posePoints.leftHip ||
    !posePoints.rightHip
  ){
    return null;
  }

  return {

    x:
      (
        posePoints.head.x +
        posePoints.leftHip.x +
        posePoints.rightHip.x
      ) / 3,

    y:
      (
        posePoints.head.y +
        posePoints.leftHip.y +
        posePoints.rightHip.y
      ) / 3

  };

}


// =====================================
// オーラ半径
// =====================================

function getAuraRadius(){

  const baseRadius = 120;

  const powerBonus =

    Math.min(
      currentShowPower * 0.002,
      100
    );

  return (
    baseRadius +
    powerBonus
  );

}


// =====================================
// 音符描画
// =====================================

function drawMusicNotes(
  centerX,
  centerY,
  radius,
  color
){

  noteRotation += 0.03;

  auraCtx.fillStyle =
    color;

  auraCtx.font =
    "30px sans-serif";

  const notes = [
    "♪",
    "♫",
    "♬",
    "♩"
  ];

  for(
    let i=0;
    i<8;
    i++
  ){

    const angle =

      noteRotation +

      (
        Math.PI * 2 / 8
      ) * i;

    const x =

      centerX +

      Math.cos(angle) *
      radius;

    const y =

      centerY +

      Math.sin(angle) *
      radius;

    auraCtx.fillText(

      notes[
        i %
        notes.length
      ],

      x,

      y

    );

  }

}


// =====================================
// オーラ描画
// =====================================

function drawAura(){

  auraCtx.clearRect(

    0,
    0,

    auraCanvas.width,
    auraCanvas.height

  );

  const center =
    getAuraCenter();

  if(!center)
    return;

  const color =
    auraColors[
      currentAttribute
    ];

  const radius =
    getAuraRadius();

  auraCtx.save();

  // -----------------
  // 内側オーラ
  // -----------------

  auraCtx.beginPath();

  auraCtx.fillStyle =
    color + "33";

  auraCtx.arc(

    center.x,
    center.y,

    radius,

    0,
    Math.PI * 2

  );

  auraCtx.fill();

  // -----------------
  // 外周リング
  // -----------------

  auraCtx.beginPath();

  auraCtx.strokeStyle =
    color;

  auraCtx.lineWidth = 6;

  auraCtx.shadowColor =
    color;

  auraCtx.shadowBlur = 25;

  auraCtx.arc(

    center.x,
    center.y,

    radius,

    0,
    Math.PI * 2

  );

  auraCtx.stroke();

  auraCtx.restore();

  drawMusicNotes(

    center.x,

    center.y,

    radius,

    color

  );

}


// =====================================
// 録画Canvas更新
// =====================================

function updateRecordCanvas(){

  const w =
    recordCanvas.width;

  const h =
    recordCanvas.height;

  recordCtx.clearRect(
    0,
    0,
    w,
    h
  );

  recordCtx.drawImage(
    video,
    0,
    0,
    w,
    h
  );

  recordCtx.drawImage(
    auraCanvas,
    0,
    0,
    w,
    h
  );

}


// =====================================
// TOP3候補取得
// =====================================

function captureTopShot(){

  try{

    const image =

      recordCanvas
      .toDataURL(
        "image/jpeg",
        0.9
      );

    topShots.push({

      score:maxShowPower,

      image

    });

    topShots.sort(

      (a,b)=>
        b.score - a.score

    );

    topShots =
      topShots.slice(
        0,
        3
      );

  }
  catch(error){

    console.log(
      error
    );

  }

}


// =====================================
// TOP3表示
// =====================================

function updateTopShotsDisplay(){

  if(topShots[0]){

    shot1.src =
      topShots[0].image;

  }

  if(topShots[1]){

    shot2.src =
      topShots[1].image;

  }

  if(topShots[2]){

    shot3.src =
      topShots[2].image;

  }

}


// =====================================
// 描画ループ
// =====================================

function renderLoop(){

  if(recording){

    calculateShowPower();

    drawAura();

    updateRecordCanvas();

  }

  requestAnimationFrame(
    renderLoop
  );

}

renderLoop();

// =====================================
// AI称号素材
// =====================================

const titlePart1 = {

  熱血:[
    "紅蓮の",
    "炎熱の",
    "燃え盛る",
    "魂震わす"
  ],

  元気:[
    "疾風の",
    "駆け抜ける",
    "超元気な",
    "躍動する"
  ],

  冷静:[
    "蒼き",
    "静寂の",
    "深海の",
    "氷結の"
  ],

  コミカル:[
    "陽気な",
    "爆笑の",
    "ご機嫌な",
    "予測不能な"
  ],

  妖艶:[
    "魅惑の",
    "妖しき",
    "月夜の",
    "誘惑する"
  ],

  カリスマ:[
    "孤高の",
    "王者の",
    "漆黒の",
    "威厳ある"
  ],

  歌うま:[
    "純白の",
    "美声の",
    "洗練された",
    "音を操る"
  ],

  歌神:[
    "神域の",
    "黄金の",
    "伝説級の",
    "世界を揺らす"
  ]

};

const titlePart2 = [

  "熱い",
  "美しい",
  "究極の",
  "安定した",
  "圧倒的な",

  "なぜか強い",
  "異次元の",
  "妙に人気な",

  "神がかった",
  "超越した",

  "限界突破した",
  "謎に目立つ"
];

const titlePart3 = [

  "歌い手",
  "絶唱者",
  "歌王",
  "吟遊詩人",

  "拍手泥棒",
  "マイク使い",

  "盛り上げ担当",

  "伝説",
  "支配者",
  "エンターテイナー"

];


// =====================================
// ランダム取得
// =====================================

function pick(array){

  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];

}


// =====================================
// AI称号生成
// =====================================

function generateTitle(){

  const first =
    pick(
      titlePart1[
        currentAttribute
      ]
    );

  const second =
    pick(
      titlePart2
    );

  const third =
    pick(
      titlePart3
    );

  return (
    first +
    second +
    third
  );

}


// =====================================
// MediaRecorder
// =====================================

function startRecorder(){

  recordedChunks = [];

  const stream =

    recordCanvas
    .captureStream(30);

  mediaRecorder =

    new MediaRecorder(
      stream,
      {
        mimeType:
        "video/webm"
      }
    );

  mediaRecorder.ondataavailable =
  event => {

    if(
      event.data &&
      event.data.size > 0
    ){

      recordedChunks.push(
        event.data
      );

    }

  };

  mediaRecorder.start();

}


// =====================================
// 録画停止
// =====================================

stopBtn.addEventListener(

  "click",

  stopRecordingSession

);

async function stopRecordingSession(){

  if(!recording)
    return;

  recording = false;

  stopBtn.disabled = true;

  retryBtn.disabled = false;

  if(mediaRecorder){

    mediaRecorder.stop();

  }

  currentAttribute =
    determineAttribute();

  currentTitle =
    generateTitle();

  createResult();

  updateTopShotsDisplay();

  enableDownloads();

}


// =====================================
// リザルト生成
// =====================================

function createResult(){

  resultNameEl.textContent =

    playerNameInput.value ||
    "名無し";

  resultAttributeEl.textContent =

    currentAttribute;

  resultTitleEl.textContent =

    currentTitle;

  resultPowerEl.textContent =

    maxShowPower
    .toLocaleString();

}


// =====================================
// ダウンロード有効化
// =====================================

function enableDownloads(){

  saveResultBtn.disabled =
    false;

  saveSummaryBtn.disabled =
    false;

  saveVideoBtn.disabled =
    false;

}


// =====================================
// 動画保存
// =====================================

saveVideoBtn.addEventListener(

  "click",

  saveVideo

);

function saveVideo(){

  const blob =

    new Blob(

      recordedChunks,

      {
        type:
        "video/webm"
      }

    );

  const url =

    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    "karaoke-aura.webm";

  link.click();

  URL.revokeObjectURL(
    url
  );

}


// =====================================
// リザルト画像保存
// =====================================

saveResultBtn.addEventListener(

  "click",

  saveResultImage

);

function saveResultImage(){

  resultCanvas.width =
    1080;

  resultCanvas.height =
    1350;

  resultCtx.fillStyle =
    "#111";

  resultCtx.fillRect(
    0,
    0,
    1080,
    1350
  );

  resultCtx.fillStyle =
    "#fff";

  resultCtx.font =
    "60px sans-serif";

  resultCtx.fillText(
    "歌唱オーラ診断",
    60,
    120
  );

  resultCtx.font =
    "46px sans-serif";

  resultCtx.fillText(
    resultNameEl.textContent,
    60,
    280
  );

  resultCtx.fillText(
    resultAttributeEl.textContent,
    60,
    400
  );

  resultCtx.fillText(
    resultTitleEl.textContent,
    60,
    520
  );

  resultCtx.fillText(
    "歌Show力 : " +
    maxShowPower,
    60,
    640
  );

  downloadCanvas(
    resultCanvas,
    "result.png"
  );

}


// =====================================
// TOP3＋リザルト保存
// =====================================

saveSummaryBtn.addEventListener(

  "click",

  saveSummaryImage

);

function saveSummaryImage(){

  resultCanvas.width =
    1080;

  resultCanvas.height =
    1920;

  resultCtx.fillStyle =
    "#111";

  resultCtx.fillRect(
    0,
    0,
    1080,
    1920
  );

  let y = 50;

  topShots.forEach(

    shot => {

      const img =
        new Image();

      img.src =
        shot.image;

      resultCtx.drawImage(

        img,

        40,
        y,

        300,
        533

      );

      y += 580;

    }

  );

  resultCtx.fillStyle =
    "#fff";

  resultCtx.font =
    "44px sans-serif";

  resultCtx.fillText(

    currentTitle,

    400,

    320

  );

  resultCtx.fillText(

    "歌Show力 : " +
    maxShowPower,

    400,

    420

  );

  downloadCanvas(

    resultCanvas,

    "summary.png"

  );

}


// =====================================
// 共通保存
// =====================================

function downloadCanvas(
  canvas,
  fileName
){

  const link =

    document
    .createElement("a");

  link.href =

    canvas.toDataURL(
      "image/png"
    );

  link.download =
    fileName;

  link.click();

}


// =====================================
// リセット
// =====================================

retryBtn.addEventListener(

  "click",

  resetSessionData

);

function resetSessionData(){

  currentShowPower = 0;

  maxShowPower = 0;

  pitchScore = 0;

  travelDistance = 0;

  previousCenter = null;

  currentAttribute = "冷静";

  currentTitle = "";

  topShots = [];

  motionStats = {

    head:0,

    elbow:0,

    wrist:0,

    hip:0,

    knee:0

  };

  previousPoints = {

    head:null,

    leftElbow:null,
    rightElbow:null,

    leftWrist:null,
    rightWrist:null,

    leftHip:null,
    rightHip:null,

    leftKnee:null,
    rightKnee:null

  };

  posePoints = {

    head:null,

    leftElbow:null,
    rightElbow:null,

    leftWrist:null,
    rightWrist:null,

    leftHip:null,
    rightHip:null,

    leftKnee:null,
    rightKnee:null

  };

  showPowerEl.textContent =
    "0";

  attributeNameEl.textContent =
    "判定中...";

  resultNameEl.textContent =
    "-";

  resultAttributeEl.textContent =
    "-";

  resultTitleEl.textContent =
    "録画終了後に表示";

  resultPowerEl.textContent =
    "0";

  shot1.src = "";
  shot2.src = "";
  shot3.src = "";

}


// =====================================
// 初期化
// =====================================

resetSessionData();

