
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