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

const resetBtn =
  document.getElementById("resetBtn");

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

const saveVideoBtn =
  document.getElementById("saveVideoBtn");

const saveResultBtn =
  document.getElementById("saveResultBtn");

const saveSummaryBtn =
  document.getElementById("saveSummaryBtn");

const history1 =
  document.getElementById("history1");

const history2 =
  document.getElementById("history2");

const history3 =
  document.getElementById("history3");

const historyLabel1 =
  document.getElementById("historyLabel1");

const historyLabel2 =
  document.getElementById("historyLabel2");

const historyLabel3 =
  document.getElementById("historyLabel3");


// =====================================
// MediaPipe
// =====================================

let poseLandmarker = null;
let lastVideoTime = -1;


// =====================================
// 状態
// =====================================

let recording = false;

let mediaRecorder = null;

let recordedChunks = [];

let cameraStream = null;

let micStream = null;

let sessionStartTime = 0;


// =====================================
// スコア
// =====================================

let currentShowPower = 0;

let maxShowPower = 0;

let pitchScore = 0;

let travelDistance = 0;

let stabilityScore = 0;


// =====================================
// 属性
// =====================================

let currentAttribute =
  "冷静";

let currentTitle = "";


// =====================================
// 属性履歴
// =====================================

let attributeHistory = [];


// =====================================
// オーラ
// =====================================

let noteRotation = 0;

// =====================================
// 保存
// =====================================

let finalVideoBlob = null;

let finalFrame = null;


// =====================================
// 音符カラー
// =====================================

const noteColors = {

  熱血:[
    "#ff3333",
    "#ff8844",
    "#ffcc44"
  ],

  元気:[
    "#33ff66",
    "#88ff33",
    "#ccff44"
  ],

  冷静:[
    "#3399ff",
    "#66ccff",
    "#99ddff"
  ],

  コミカル:[
    "#ffd700",
    "#ffeb66",
    "#ff9900"
  ],

  妖艶:[
    "#aa55ff",
    "#dd77ff",
    "#ff99ff"
  ],

  カリスマ:[
    "#666666",
    "#999999",
    "#cccccc"
  ],

  歌うま:[
    "#ffffff",
    "#ddddff",
    "#ffeeff"
  ],

  歌神:[
    "#ffd700",
    "#fff07a",
    "#fff8c0"
  ]

};

// =====================================
// 音声解析
// =====================================

let audioContext = null;

let analyser = null;

let frequencyData = null;


// =====================================
// Pose座標
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
// 前回座標
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
// 移動統計
// =====================================

let motionStats = {

  head:0,

  elbow:0,

  wrist:0,

  hip:0,

  knee:0

};


// =====================================
// 10秒評価用
// =====================================

let motionBuffer = [];

let stillFrames = 0;

let previousCenter = null;


// =====================================
// 属性色
// =====================================

const auraColors = {

  熱血:"#ff4444",

  元気:"#44ff66",

  冷静:"#3399ff",

  コミカル:"#ffd93d",

  妖艶:"#b266ff",

  カリスマ:"#666666",

  歌うま:"#ffffff",

  歌神:"#ffd700"

};


// =====================================
// 起動
// =====================================

window.addEventListener(

  "load",

  async ()=>{

    await setupCamera();

    await setupMicrophone();

    resizeCanvas();

    window.addEventListener(
      "resize",
      resizeCanvas
    );

  }

);


// =====================================
// Canvasサイズ
// =====================================

function resizeCanvas(){

  const rect =
    video.getBoundingClientRect();

  auraCanvas.width =
    rect.width;

  auraCanvas.height =
    rect.height;

  recordCanvas.width =
    rect.width;

  recordCanvas.height =
    rect.height;

}

// =====================================
// カメラ起動
// =====================================

async function setupCamera(){

  try{

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

  }
  catch(error){

    console.error(error);

    alert(
      "カメラを起動できませんでした"
    );

  }

}


// =====================================
// マイク
// =====================================

async function setupMicrophone(){

  try{

    micStream =
      await navigator.mediaDevices
      .getUserMedia({

        audio:true

      });

    audioContext =
      new AudioContext();

    const source =
      audioContext
      .createMediaStreamSource(
        micStream
      );

    analyser =
      audioContext
      .createAnalyser();

    analyser.fftSize = 2048;

    frequencyData =
      new Uint8Array(
        analyser.frequencyBinCount
      );

    source.connect(analyser);

  }
  catch(error){

    console.error(error);

    alert(
      "マイクを取得できませんでした"
    );

  }

}


// =====================================
// MediaPipe初期化
// =====================================

async function initPose(){

  if(poseLandmarker) return;

  const vision =
    await FilesetResolver
    .forVisionTasks(

      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"

    );

  poseLandmarker =
    await PoseLandmarker
    .createFromOptions(

      vision,

      {

        baseOptions:{

          modelAssetPath:

"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",

          delegate:"GPU"

        },

        runningMode:"VIDEO",

        numPoses:1

      }

    );

}


// =====================================
// 音声スコア
// =====================================

function updatePitchScore(){

  if(!analyser) return;

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
// 録画開始
// =====================================

async function startRecording(){
　finalVideoBlob = null;
　finalFrame = null;
  await initPose();

  recordedChunks = [];

  recording = true;

  sessionStartTime =
    Date.now();

  currentShowPower = 0;

  maxShowPower = 0;

  travelDistance = 0;

  pitchScore = 0;

  stabilityScore = 0;

  motionBuffer = [];

  attributeHistory = [];

  stillFrames = 0;

  startBtn.disabled = true;

  stopBtn.disabled = false;

  resetBtn.disabled = true;

  saveVideoBtn.disabled = true;

  saveResultBtn.disabled = true;

  saveSummaryBtn.disabled = true;

  const combinedStream =
    recordCanvas.captureStream(30);

  micStream
    .getAudioTracks()
    .forEach(track=>{

      combinedStream.addTrack(
        track
      );

    });

  mediaRecorder =
  new MediaRecorder(

    combinedStream,

    {
      mimeType:"video/webm"
    }

  );

mediaRecorder.ondataavailable =
  event=>{

    if(
      event.data &&
      event.data.size > 0
    ){

      recordedChunks.push(
        event.data
      );

    }

  };

mediaRecorder.onstop = ()=>{

  finalVideoBlob =

    new Blob(

      recordedChunks,

      {
        type:"video/webm"
      }

    );

};

mediaRecorder.start();

  requestAnimationFrame(
    renderLoop
  );

}
  saveVideoBtn.disabled = false;

  saveResultBtn.disabled = false;

  saveSummaryBtn.disabled = false;

};

// =====================================
// 録画停止
// =====================================

function stopRecording(){

  recording = false;

  stopBtn.disabled = true;

  resetBtn.disabled = false;

  finalFrame =
    recordCanvas.toDataURL(
      "image/png"
    );

  if(mediaRecorder){

    mediaRecorder.stop();

  }

  if(cameraStream){

    cameraStream
      .getTracks()
      .forEach(track=>{

        track.stop();

      });

  }

  createFinalResult();

}


// =====================================
// ボタン
// =====================================

startBtn.addEventListener(

  "click",

  startRecording

);

stopBtn.addEventListener(

  "click",

  stopRecording

);


// =====================================
// 10秒判定
// =====================================

setInterval(()=>{

  if(!recording) return;

  evaluateAttribute();

},10000);

// =====================================
// 距離計算
// =====================================

function distance(a,b){

  if(!a || !b) return 0;

  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(
    dx*dx + dy*dy
  );

}


// =====================================
// ノイズ除去
// =====================================

function filteredDistance(a,b){

  const d =
    distance(a,b);

  if(d < 0.008){
    return 0;
  }

  return d;

}


// =====================================
// Pose取得
// =====================================

function updatePosePoints(landmarks){

  posePoints.head = landmarks[0];

  posePoints.leftElbow = landmarks[13];
  posePoints.rightElbow = landmarks[14];

  posePoints.leftWrist = landmarks[15];
  posePoints.rightWrist = landmarks[16];

  posePoints.leftHip = landmarks[23];
  posePoints.rightHip = landmarks[24];

  posePoints.leftKnee = landmarks[25];
  posePoints.rightKnee = landmarks[26];

}


// =====================================
// 動き量計算
// =====================================

function updateMotionStats(){

  motionStats.head += filteredDistance(
    posePoints.head,
    previousPoints.head
  );

  motionStats.elbow +=
    filteredDistance(
      posePoints.leftElbow,
      previousPoints.leftElbow
    ) +
    filteredDistance(
      posePoints.rightElbow,
      previousPoints.rightElbow
    );

  motionStats.wrist +=
    filteredDistance(
      posePoints.leftWrist,
      previousPoints.leftWrist
    ) +
    filteredDistance(
      posePoints.rightWrist,
      previousPoints.rightWrist
    );

  motionStats.hip +=
    filteredDistance(
      posePoints.leftHip,
      previousPoints.leftHip
    ) +
    filteredDistance(
      posePoints.rightHip,
      previousPoints.rightHip
    );

  motionStats.knee +=
    filteredDistance(
      posePoints.leftKnee,
      previousPoints.leftKnee
    ) +
    filteredDistance(
      posePoints.rightKnee,
      previousPoints.rightKnee
    );

}


// =====================================
// 移動量
// =====================================

function updateTravelDistance(){

  if(
    !posePoints.leftHip ||
    !posePoints.rightHip
  ){
    return;
  }

  const center = {

    x:
      (posePoints.leftHip.x +
      posePoints.rightHip.x) / 2,

    y:
      (posePoints.leftHip.y +
      posePoints.rightHip.y) / 2

  };

  if(previousCenter){

    travelDistance +=
      filteredDistance(
        center,
        previousCenter
      );

  }

  previousCenter = center;

}


// =====================================
// バッファ追加
// =====================================

function updateMotionBuffer(){

  const total =

    motionStats.head +

    motionStats.elbow +

    motionStats.wrist +

    motionStats.hip +

    motionStats.knee;

  motionBuffer.push({

    head:motionStats.head,
    elbow:motionStats.elbow,
    wrist:motionStats.wrist,
    hip:motionStats.hip,
    knee:motionStats.knee,

    total:total,

    time:Date.now()

  });

}


// =====================================
// 歌Show力
// =====================================

function updateShowPower(){

  const motionPower =

    motionStats.head * 100 +

    motionStats.elbow * 120 +

    motionStats.wrist * 150 +

    motionStats.hip * 100 +

    motionStats.knee * 120;

  const movePower =
    travelDistance * 200;

  const voicePower =
    pitchScore * 2;

  currentShowPower = Math.floor(

    motionPower +

    movePower +

    voicePower

  );

  if(
    currentShowPower >
    maxShowPower
  ){

    maxShowPower =
      currentShowPower;

  }

  showPowerEl.textContent =
    currentShowPower;

}


// =====================================
// AI称号生成
// =====================================

function generateTitle(){

  const prefixMap = {

    "熱血":[
      "紅蓮の",
      "燃え盛る",
      "炎熱の"
    ],

    "元気":[
      "跳躍する",
      "疾走する",
      "全力の"
    ],

    "冷静":[
      "静寂の",
      "蒼き",
      "理知の"
    ],

    "コミカル":[
      "爆笑の",
      "愉快な",
      "自由な"
    ],

    "妖艶":[
      "魅惑の",
      "妖美なる",
      "艶やかな"
    ],

    "カリスマ":[
      "孤高の",
      "伝説の",
      "圧倒的"
    ],

    "歌うま":[
      "美声の",
      "歌唱の",
      "旋律の"
    ],

    "歌神":[
      "神域の",
      "黄金の",
      "奇跡の"
    ]

  };

  const middle = [

    "超越",
    "異次元",
    "伝説",
    "覚醒",
    "究極",
    "無限",
    "天空",
    "銀河",
    "幻影",
    "衝撃"

  ];

  const suffix = [

    "歌い手",
    "シンガー",
    "表現者",
    "スター",
    "支配者",
    "覇者",
    "パフォーマー",
    "挑戦者",
    "主人公",
    "レジェンド"

  ];

  const p =
    prefixMap[currentAttribute];

  currentTitle =

    p[
      Math.floor(
        Math.random()*p.length
      )
    ]

    +

    middle[
      Math.floor(
        Math.random()*middle.length
      )
    ]

    +

    suffix[
      Math.floor(
        Math.random()*suffix.length
      )
    ];

}

// =====================================
// 属性判定
// =====================================

function evaluateAttribute(){

  let upper =

    motionStats.head +

    motionStats.elbow +

    motionStats.wrist;

  let lower =

    motionStats.hip +

    motionStats.knee +

    travelDistance;

  let total =
    upper + lower;

  if(total < 5){

    currentAttribute =
      "カリスマ";

  }

  else if(

    currentShowPower > 2500 &&
    pitchScore > 50

  ){

    currentAttribute =
      "歌神";

  }

  else if(

    pitchScore > 40

  ){

    currentAttribute =
      "歌うま";

  }

  else if(

    travelDistance > 2.0

  ){

    currentAttribute =
      "元気";

  }

  else if(

    upper > lower * 1.5

  ){

    currentAttribute =
      "妖艶";

  }

  else if(

    motionStats.head >
    total * 0.3

  ){

    currentAttribute =
      "コミカル";

  }

  else if(

    total > 15

  ){

    currentAttribute =
      "熱血";

  }

  else{

    currentAttribute =
      "冷静";

  }

  attributeNameEl.textContent =
    currentAttribute;

  saveAttributeMoment();

}


// =====================================
// 属性変化履歴
// =====================================

function saveAttributeMoment(){

  if(

    attributeHistory.length > 0 &&

    attributeHistory[
      attributeHistory.length - 1
    ].attribute === currentAttribute

  ){
    return;
  }

  const temp =
    document.createElement(
      "canvas"
    );

  temp.width =
    recordCanvas.width;

  temp.height =
    recordCanvas.height;

  const ctx =
    temp.getContext("2d");

  ctx.drawImage(
    video,
    0,
    0,
    temp.width,
    temp.height
  );

  ctx.drawImage(
    auraCanvas,
    0,
    0
  );

  attributeHistory.push({

    attribute:
      currentAttribute,

    image:
      temp.toDataURL(
        "image/png"
      )

  });

  if(
    attributeHistory.length > 3
  ){
    attributeHistory.shift();
  }

  updateHistoryView();

}


function updateHistoryView(){

  const slots = [

    {
      img:history1,
      label:historyLabel1
    },

    {
      img:history2,
      label:historyLabel2
    },

    {
      img:history3,
      label:historyLabel3
    }

  ];

  slots.forEach((slot,index)=>{

    const item =
      attributeHistory[index];

    if(item){

      slot.img.src =
        item.image;

      slot.label.textContent =
        item.attribute;

    }

  });

}


// =====================================
// オーラ中心
// =====================================

function getAuraCenter(){

  if(
    !posePoints.leftHip ||
    !posePoints.rightHip
  ){
    return null;
  }

  return {

    x:
      ((posePoints.leftHip.x +
      posePoints.rightHip.x) / 2)
      *
      auraCanvas.width,

    y:
      ((posePoints.leftHip.y +
      posePoints.rightHip.y) / 2)
      *
      auraCanvas.height

  };

}


// =====================================
// オーラ半径
// =====================================

function getAuraRadius(){

  return Math.min(

    220,

    100 +
    currentShowPower * 0.02

  );

}


// =====================================
// 五線譜
// =====================================

function drawStaffCircle(
  center,
  radius
){

  const spacing = 7;

  auraCtx.strokeStyle =
    "rgba(255,255,255,0.3)";

  auraCtx.lineWidth = 2;

  for(
    let i=0;
    i<5;
    i++
  ){

    const r =
      radius +
      (i-2)*spacing;

    auraCtx.beginPath();

    auraCtx.arc(

      center.x,
      center.y,

      r,

      0,
      Math.PI*2

    );

    auraCtx.stroke();

  }

}


// =====================================
// 音符
// =====================================

function drawNotes(
  center,
  radius
){

  noteRotation += 0.02;

  const count = Math.min(

    40,

    Math.floor(
      currentShowPower / 150
    ) + 3

  );

  auraCtx.font =
    "24px sans-serif";

  const progress =
    Math.min(

      1,

      (
        Date.now() -
        sessionStartTime
      ) / 60000

    );

  for(
    let i=0;
    i<count;
    i++    
  ){
const palette =
    noteColors[
      currentAttribute
    ];

  auraCtx.fillStyle =
    palette[
      i %
      palette.length
    ];

  const angle =
    noteRotation +
    (
      Math.PI*2 /
      count
    ) * i;

  // 以下続く
}
    const angle =

      noteRotation +

      (
        Math.PI*2 /
        count
      ) * i;

    const amp =

      Math.min(

        40,

        currentShowPower *
        0.001

      );

    const r =

      radius +

      30 +

      Math.sin(
        i +
        noteRotation*3
      ) * amp;

    const x =
      center.x +
      Math.cos(angle) * r;

    const y =
      center.y +
      Math.sin(angle) * r;

    auraCtx.fillText(
      "♪",
      x,
      y
    );

  }

  // 後半追加

  if(

  progress > 0.5 &&

  currentShowPower > 1500

){

    for(
      let i=0;
      i<count;
      i++
    ){

      const angle =

        noteRotation*1.5 +

        (
          Math.PI*2 /
          count
        ) * i;

      const r =

        radius +

        100 +

        Math.sin(
          noteRotation+i
        ) * 30;

      auraCtx.fillText(

        i%2
          ? "♫"
          : "♪",

        center.x +
        Math.cos(angle)*r,

        center.y +
        Math.sin(angle)*r

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

  if(!center){
    return;
  }

  const radius =
    getAuraRadius();

  const color =
    auraColors[
      currentAttribute
    ];

  drawStaffCircle(
    center,
    radius
  );

  auraCtx.beginPath();

  auraCtx.fillStyle =
    color + "33";

  auraCtx.arc(

    center.x,
    center.y,

    radius,

    0,
    Math.PI*2

  );

  auraCtx.fill();

  auraCtx.beginPath();

  auraCtx.strokeStyle =
    color;

  auraCtx.lineWidth = 4;

  auraCtx.shadowBlur = 20;

  auraCtx.shadowColor =
    color;

  auraCtx.arc(

    center.x,
    center.y,

    radius,

    0,
    Math.PI*2

  );

  auraCtx.stroke();

  auraCtx.shadowBlur = 0;

  drawNotes(
    center,
    radius
  );

}


// =====================================
// MediaPipeループ
// =====================================

async function renderLoop(){

  if(!recording){
    return;
  }

  updatePitchScore();

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

        performance.now()

      );

    if(

      result.landmarks &&
      result.landmarks.length

    ){

      const landmarks =
        result.landmarks[0];

      updatePosePoints(
        landmarks
      );

      updateMotionStats();

      updateTravelDistance();

      updateMotionBuffer();

      updateShowPower();

      drawAura();

      previousPoints =

        structuredClone(
          posePoints
        );

    }

  }

  recordCtx.clearRect(

    0,
    0,

    recordCanvas.width,
    recordCanvas.height

  );

  recordCtx.drawImage(

    video,

    0,
    0,

    recordCanvas.width,
    recordCanvas.height

  );

  recordCtx.drawImage(

    auraCanvas,

    0,
    0

  );

  requestAnimationFrame(
    renderLoop
  );

}


// =====================================
// リザルト
// =====================================

function createFinalResult(){

  generateTitle();

  resultNameEl.textContent =

    playerNameInput.value ||
    "Player";

  resultAttributeEl.textContent =
    currentAttribute;

  resultTitleEl.textContent =
    currentTitle;

  resultPowerEl.textContent =
    maxShowPower;

}


// =====================================
// リセット
// =====================================

resetBtn.addEventListener(

  "click",

  ()=>{

    currentShowPower = 0;
    maxShowPower = 0;

    travelDistance = 0;

    motionStats = {

      head:0,
      elbow:0,
      wrist:0,
      hip:0,
      knee:0

    };
    
resultNameEl.textContent="-";

resultAttributeEl.textContent="-";

resultPowerEl.textContent="0";

resultTitleEl.textContent=
"録画終了後に表示";

history1.src="";
history2.src="";
history3.src="";

historyLabel1.textContent="-";
historyLabel2.textContent="-";
historyLabel3.textContent="-";

saveVideoBtn.disabled=true;
saveResultBtn.disabled=true;
saveSummaryBtn.disabled=true;

setupCamera();
    
    attributeHistory = [];

    showPowerEl.textContent =
      "0";

    attributeNameEl.textContent =
      "判定中...";

    resultTitleEl.textContent =
      "録画終了後に表示";

    updateHistoryView();

    startBtn.disabled = false;

  }

);

saveVideoBtn.addEventListener(
  "click",
  saveVideo
);

saveResultBtn.addEventListener(
  "click",
  saveResultImage
);

saveSummaryBtn.addEventListener(
  "click",
  saveHistoryImage
);

function saveVideo(){

  if(!finalVideoBlob) return;

  const url =
    URL.createObjectURL(
      finalVideoBlob
    );

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "uta-show.webm";

  a.click();

}

function saveResultImage(){

  if(!finalFrame) return;

  const a =
    document.createElement("a");

  a.href = finalFrame;

  a.download =
    "result.png";

  a.click();

}

function saveHistoryImage(){

  if(
    attributeHistory.length === 0
  ){
    return;
  }

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 1080;
  canvas.height = 1920;

  const ctx =
    canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  attributeHistory.forEach(

    (item,index)=>{

      const img =
        new Image();

      img.onload = ()=>{

        ctx.drawImage(

          img,

          40,

          40 + index*600,

          1000,

          550

        );

      };

      img.src =
        item.image;

    }

  );

  setTimeout(()=>{

    const a =
      document.createElement("a");

    a.href =
      canvas.toDataURL(
        "image/png"
      );

    a.download =
      "history.png";

    a.click();

  },500);

}

