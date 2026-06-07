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
        mimeType:
          "video/webm"
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

  mediaRecorder.start();

  requestAnimationFrame(
    renderLoop
  );

}


// =====================================
// 録画停止
// =====================================

function stopRecording(){

  recording = false;

  stopBtn.disabled = true;

  resetBtn.disabled = false;

  saveVideoBtn.disabled = false;

  saveResultBtn.disabled = false;

  saveSummaryBtn.disabled = false;

  if(mediaRecorder){

    mediaRecorder.stop();

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

