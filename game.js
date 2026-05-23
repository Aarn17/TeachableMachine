
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
