const MODEL_URL = "https://teachablemachine.withgoogle.com/models/SJnYq0eQY/";

let model, webcam;
let currentPose = "Middle";

const vragen = [
  { vraag: "Which country won the World Cup in 2018?",        flagL: "frankrijk",   links: "France",        flagR: "kroatie",     rechts: "Croatia",      correct: "links"  },
  { vraag: "Which country has won the most World Cups?",      flagL: "brazilie",    links: "Brazil",        flagR: "duitsland",   rechts: "Germany",      correct: "links"  },
  { vraag: "Which country hosted the 2010 World Cup?",        flagL: "zuidafrika",  links: "South Africa",  flagR: "egypte",      rechts: "Egypt",        correct: "links"  },
  { vraag: "Which country won the first World Cup in 1930?",  flagL: "uruguay",     links: "Uruguay",       flagR: "argentinie",  rechts: "Argentina",    correct: "links"  },
  { vraag: "Which country became world champion in 2022?",    flagL: "argentinie",  links: "Argentina",     flagR: "frankrijk",   rechts: "France",       correct: "links"  },
];

let gameState    = "start";
let huidigeVraag = 0;
let score        = 0;
let timerInterval     = null;
let timeLeft          = 10;
let totalTime         = 0;
let totalTimeInterval = null;
let antwoordGegeven   = false;
let startSequence     = [];

let answerCooldown = false; 

const POSE_HOLD_MS  = 400;
let pendingPose     = null;
let pendingPoseTime = 0;

// SOUND EFFECTS : AI GEBRUIKT
let audioCtx  = null;
let bgPlaying = false;
let bgTimer   = null;
let bgBeat    = 0;

const BPM     = 120;
const BEAT_MS = (60 / BPM) * 1000; 

const BG_MELODY = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99]; 
const BG_BASS   = [130.81, 195.99, 130.81, 195.99];                                 
const BG_CHORDS = [
  [261.63, 329.63, 392.00], 
  [195.99, 246.94, 293.66], 
];

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, type, startT, dur, vol) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(vol, startT);
  env.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(startT);
  osc.stop(startT + dur + 0.01);
}

function playWhoosh() {
  const ctx  = getCtx();
  const len  = Math.floor(ctx.sampleRate * 0.5);
  const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src  = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type  = "bandpass";
  filt.frequency.setValueAtTime(100, ctx.currentTime);
  filt.frequency.exponentialRampToValueAtTime(5000, ctx.currentTime + 0.5);
  filt.Q.value = 0.8;
  const env  = ctx.createGain();
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.06);
  env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
  src.connect(filt);
  filt.connect(env);
  env.connect(ctx.destination);
  src.start();
}

function playTick() {
  const ctx = getCtx();
  tone(900, "square", ctx.currentTime, 0.07, 0.12);
}

function playTimerBeep() {
  const ctx = getCtx();
  tone(880, "sine", ctx.currentTime, 0.13, 0.2);
}

function playSuccess() {
  const ctx = getCtx();
  const t   = ctx.currentTime;
  [[523.25, 0], [659.25, 0.1], [783.99, 0.19], [1046.5, 0.28]].forEach(([f, s]) =>
    tone(f, "sine", t + s, 0.35, 0.22)
  );
}

function playWrong() {
  const ctx = getCtx();
  const t   = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type  = "sawtooth";
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
  env.gain.setValueAtTime(0.22, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.41);
}

function playTimeout() {
  const ctx = getCtx();
  const t   = ctx.currentTime;
  [0, 0.2, 0.4].forEach(offset => tone(160, "sawtooth", t + offset, 0.16, 0.28));
}

function playFanfare() {
  const ctx = getCtx();
  const t   = ctx.currentTime;
  [[392, 0], [523.25, 0.13], [659.25, 0.25], [783.99, 0.38], [1046.5, 0.52]].forEach(([f, s]) =>
    tone(f, "sine", t + s, 0.35, 0.24)
  );
}

function playNewRecord() {
  const ctx = getCtx();
  const t   = ctx.currentTime;
  [[523.25, 0, 0.1], [659.25, 0.11, 0.1], [783.99, 0.22, 0.1],
   [1046.5, 0.33, 0.15], [1318.51, 0.5, 0.5]].forEach(([f, s, d]) =>
    tone(f, "sine", t + s, d + 0.12, 0.3)
  );
}

function bgStep() {
  if (!bgPlaying) return;
  const ctx  = getCtx();
  const t    = ctx.currentTime;
  const beat = BEAT_MS / 1000;

  tone(BG_MELODY[bgBeat % 8], "sine", t, beat * 0.85, 0.045);

  if (bgBeat % 2 === 0) {
    tone(BG_BASS[Math.floor(bgBeat / 2) % 4], "sine", t, beat * 1.9, 0.07);
    BG_CHORDS[Math.floor(bgBeat / 4) % 2].forEach(f =>
      tone(f, "triangle", t, beat * 0.3, 0.025)
    );
  }

  bgBeat++;
  bgTimer = setTimeout(bgStep, BEAT_MS);
}

function startBgMusic() {
  if (bgPlaying) return;
  bgPlaying = true;
  bgBeat    = 0;
  bgStep();
}

function stopBgMusic() {
  bgPlaying = false;
  if (bgTimer) { clearTimeout(bgTimer); bgTimer = null; }
}

let bgGamePlaying = false;
let bgGameTimer   = null;
let bgGameBeat    = 0;

const BG_GAME_BEAT_MS = 900; 
const BG_GAME_BASS    = [130.81, 130.81, 146.83, 130.81]; 
const BG_GAME_CHORDS  = [
  [261.63, 311.13, 392.00], 
  [195.99, 233.08, 293.66], 
];

function bgGameStep() {
  if (!bgGamePlaying) return;
  const ctx  = getCtx();
  const t    = ctx.currentTime;
  const beat = BG_GAME_BEAT_MS / 1000;

  tone(BG_GAME_BASS[bgGameBeat % 4], "sine", t, beat * 0.75, 0.055);

  if (bgGameBeat % 2 === 0) {
    BG_GAME_CHORDS[Math.floor(bgGameBeat / 2) % 2].forEach(f =>
      tone(f, "sine", t, beat * 1.6, 0.02)
    );
  }

  bgGameBeat++;
  bgGameTimer = setTimeout(bgGameStep, BG_GAME_BEAT_MS);
}

function startBgGameMusic() {
  if (bgGamePlaying) return;
  bgGamePlaying = true;
  bgGameBeat    = 0;
  bgGameStep();
}

function stopBgGameMusic() {
  bgGamePlaying = false;
  if (bgGameTimer) { clearTimeout(bgGameTimer); bgGameTimer = null; }
}

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  startBgMusic();
}
document.addEventListener("click", unlockAudio, { once: true });

async function init() {
  model = await tmPose.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
  webcam = new tmPose.Webcam(400, 300, true);
  await webcam.setup();
  await webcam.play();
  document.getElementById("camera-start").appendChild(webcam.canvas);
  loop();
}

async function loop() {
  webcam.update();
  await predict();
  requestAnimationFrame(loop);
}

async function predict() {
  const { posenetOutput } = await model.estimatePose(webcam.canvas);
  const predictions = await model.predict(posenetOutput);

  const best = predictions.reduce((a, b) => a.probability > b.probability ? a : b);
  const pose = best.className;
  const now  = Date.now();

  if (pose === currentPose) {
    pendingPose = null;
  } else if (pose === pendingPose) {
    if (now - pendingPoseTime >= POSE_HOLD_MS) {
      currentPose = pose;
      pendingPose = null;
      handlePoseChange(pose);
    }
  } else {
    pendingPose     = pose;
    pendingPoseTime = now;
  }

}

function handlePoseChange(pose) {
  if (gameState === "start") {
    handleStartDetectie(pose);
  } else if (gameState === "game") {
    handleGameDetectie(pose);
  } else if (gameState === "score") {
    handleScoreDetectie(pose);
  }
}

function handleStartDetectie(pose) {
  if (pose === "Middle") return;

  startSequence.push(pose);
  if (startSequence.length > 2) startSequence.shift();

  if (startSequence.length === 2) {
    const [a, b] = startSequence;
    if ((a === "Left" && b === "Right") || (a === "Right" && b === "Left")) {
      startSequence = [];
      startGame();
    }
  }
}

function handleGameDetectie(pose) {
  if (antwoordGegeven) return;
  if (answerCooldown)  return;
  if (pose === "Middle") return;

  if (pose === "Left")  selecteerAntwoord("links");
  if (pose === "Right") selecteerAntwoord("rechts");
}

function handleScoreDetectie(pose) {
  if (pose === "Left" || pose === "Right") {
    herstartGame();
  }
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function startGame() {
  gameState    = "game";
  huidigeVraag = 0;
  score        = 0;
  totalTime    = 0;
  currentPose  = "Middle"; 

  showScreen("screen-game");
  document.getElementById("camera-game").appendChild(webcam.canvas);

  clearInterval(totalTimeInterval);
  totalTimeInterval = setInterval(() => totalTime++, 1000);

  laadVraag();
}

function laadVraag() {
  antwoordGegeven = false;
  answerCooldown  = true;  
  setTimeout(() => { answerCooldown = false; }, 1500);

  timeLeft = 10;
  const v  = vragen[huidigeVraag];

  document.getElementById("question-text").innerText    = v.vraag;
  document.getElementById("flag-left").src              = `images/${v.flagL}.png`;
  document.getElementById("flag-right").src             = `images/${v.flagR}.png`;
  document.getElementById("country-left").innerText     = v.links;
  document.getElementById("country-right").innerText    = v.rechts;
  document.getElementById("question-counter").innerText = `Question : ${huidigeVraag + 1}/5`;
  document.getElementById("timer-display").innerText    = `Time left : ${timeLeft}s`;

  document.getElementById("answer-left").className  = "answer-box animate-in";
  document.getElementById("answer-right").className = "answer-box animate-in";
  document.getElementById("timer-display").classList.remove("timer-urgent");

  const qBubble = document.querySelector(".question-bubble");
  qBubble.classList.remove("animate-in");
  qBubble.offsetHeight; 
  qBubble.classList.add("animate-in");

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer-display").innerText = `Time left : ${timeLeft}s`;
    if (timeLeft <= 3 && timeLeft > 0) {
      document.getElementById("timer-display").classList.add("timer-urgent");
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      tijdVoorbij();
    }
  }, 1000);
}

function selecteerAntwoord(kant) {
  if (antwoordGegeven) return;
  antwoordGegeven = true;
  clearInterval(timerInterval);
  document.getElementById("timer-display").classList.remove("timer-urgent");

  const v       = vragen[huidigeVraag];
  const correct = kant === v.correct;

  if (correct) score++;

  const boxLinks  = document.getElementById("answer-left");
  const boxRechts = document.getElementById("answer-right");

  if (kant === "links") {
    boxLinks.classList.add(correct ? "correct" : "wrong");
  } else {
    boxRechts.classList.add(correct ? "correct" : "wrong");
  }

   if (!correct) {
    const correctBox = v.correct === "links" ? boxLinks : boxRechts;
    correctBox.classList.add("correct");
  }

  setTimeout(volgendeVraag, 1500);
}

function tijdVoorbij() {
  if (antwoordGegeven) return;
  antwoordGegeven = true;
  document.getElementById("timer-display").classList.remove("timer-urgent");

  const v = vragen[huidigeVraag];
  const correctBox = v.correct === "links"
    ? document.getElementById("answer-left")
    : document.getElementById("answer-right");
  correctBox.classList.add("correct");

  setTimeout(volgendeVraag, 1500);
}

function volgendeVraag() {
  huidigeVraag++;
  if (huidigeVraag < vragen.length) {
    laadVraag();
  } else {
    eindScherm();
  }
}

function eindScherm() {
  clearInterval(totalTimeInterval);
  gameState = "score";
  showScreen("screen-score");
  document.getElementById("camera-score").appendChild(webcam.canvas);

  document.getElementById("correct-count").innerText = score;
  const min = String(Math.floor(totalTime / 60)).padStart(2, "0");
  const sec = String(totalTime % 60).padStart(2, "0");
  document.getElementById("time-taken").innerText = `${min}:${sec}`;


  const prevBest     = localStorage.getItem("wkquiz_highscore");
  const prevBestTime = localStorage.getItem("wkquiz_besttime");
  const gamesPlayed  = parseInt(localStorage.getItem("wkquiz_games_played") ?? "0");

  const heeftRecord = prevBest !== null;
  let isNewRecord = false;

  if (!heeftRecord) {
    isNewRecord = true;
  } else {
    const prevScore = parseInt(prevBest);
    const prevTime  = parseInt(prevBestTime);
    isNewRecord = score > prevScore || (score === prevScore && totalTime < prevTime);
  }

  if (isNewRecord) {
    localStorage.setItem("wkquiz_highscore", score);
    localStorage.setItem("wkquiz_besttime",  totalTime);
  }
  localStorage.setItem("wkquiz_games_played", gamesPlayed + 1);

  const bestScore    = isNewRecord ? score      : parseInt(prevBest);
  const bestTimeSec  = isNewRecord ? totalTime  : parseInt(prevBestTime);
  const bestMin      = String(Math.floor(bestTimeSec / 60)).padStart(2, "0");
  const bestSec      = String(bestTimeSec % 60).padStart(2, "0");

  document.getElementById("personal-best").textContent = `${bestScore}/5`;
  document.getElementById("best-time").textContent     = `${bestMin}:${bestSec}`;
  document.getElementById("games-played").textContent  = gamesPlayed + 1;

  const recordEl = document.getElementById("new-record");
  recordEl.style.display = isNewRecord ? "block" : "none";
  if (isNewRecord) {
    recordEl.classList.remove("animate-in");
    void recordEl.offsetWidth;
    recordEl.classList.add("animate-in");
  }

  const scoreboard  = document.querySelector(".scoreboard");
  const camScore    = document.querySelector(".camera-score");
  const finalScore  = document.getElementById("final-score");
  scoreboard.classList.remove("animate-in");
  camScore.classList.remove("animate-in");
  finalScore.classList.remove("animate-in");
  scoreboard.offsetHeight;
  scoreboard.classList.add("animate-in");
  camScore.classList.add("animate-in");
  finalScore.classList.add("animate-in");

  let teller = 0;
  finalScore.textContent = "0/5";
  const countUp = setInterval(() => {
    teller++;
    finalScore.textContent = `${teller}/5`;
    if (teller >= score) clearInterval(countUp);
  }, 200);
}

function herstartGame() {
  startSequence    = [];
  currentPose      = "Middle";
  gameState        = "start";
  showScreen("screen-start");
  document.getElementById("camera-start").appendChild(webcam.canvas);
}

init();