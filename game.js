
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


