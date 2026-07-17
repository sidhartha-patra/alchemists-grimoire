// affinity.js — "The Sorting Ritual": an original Affinity Test that assigns a seeker
// to one of the four elemental Orders. No external IP; purely virtue/element based.

import { HOUSE_ORDER } from "./houses.js";

// Each option grants weight to a primary Order (+3) and a kindred Order (+1),
// producing nuanced, non-obvious results across six questions.
export const QUESTIONS = [
  {
    prompt: "A locked door bars your path in the Academy's undercroft. You...",
    options: [
      { text: "Strike it once, hard — locks yield to nerve.", weights: { ember: 3, stone: 1 } },
      { text: "Study the mechanism until its secret reveals itself.", weights: { tide: 3, gale: 1 } },
      { text: "Try three clever tricks in quick succession.", weights: { gale: 3, ember: 1 } },
      { text: "Wait, and watch who else comes to open it.", weights: { stone: 3, tide: 1 } }
    ]
  },
  {
    prompt: "Which relic in the Founder's vault calls to you?",
    options: [
      { text: "A lantern whose flame answers to feeling.", weights: { ember: 3, gale: 1 } },
      { text: "A basin that shows the true shape of things.", weights: { tide: 3, stone: 1 } },
      { text: "A compass that points to unanswered questions.", weights: { gale: 3, tide: 1 } },
      { text: "A ring that has never once broken a promise.", weights: { stone: 3, ember: 1 } }
    ]
  },
  {
    prompt: "Your closest companion errs badly. You...",
    options: [
      { text: "Confront them at once, with heat and honesty.", weights: { ember: 3, stone: 1 } },
      { text: "Weigh the whole of it before you speak.", weights: { tide: 3, gale: 1 } },
      { text: "Reframe the fault into a lesson you both laugh at.", weights: { gale: 3, ember: 1 } },
      { text: "Stand by them quietly and help repair the harm.", weights: { stone: 3, tide: 1 } }
    ]
  },
  {
    prompt: "The Academy asks what you will give it. You offer...",
    options: [
      { text: "The fire to attempt what others call impossible.", weights: { ember: 3, gale: 1 } },
      { text: "The clarity to see a problem to its root.", weights: { tide: 3, stone: 1 } },
      { text: "The invention to find the door no one drew.", weights: { gale: 3, tide: 1 } },
      { text: "The constancy to keep watch when others tire.", weights: { stone: 3, ember: 1 } }
    ]
  },
  {
    prompt: "A forbidden book lies open before you at midnight. You...",
    options: [
      { text: "Read boldly — knowledge is not to be feared.", weights: { ember: 2, gale: 2 } },
      { text: "Note its every warning before turning a page.", weights: { tide: 3, stone: 1 } },
      { text: "Devour it whole, then question all it claims.", weights: { gale: 3, tide: 1 } },
      { text: "Close it, and ask the Archmage for counsel first.", weights: { stone: 3, tide: 1 } }
    ]
  },
  {
    prompt: "In the end, you wish to be remembered as one who was...",
    options: [
      { text: "Brave — who dared when it mattered.", weights: { ember: 3, stone: 1 } },
      { text: "Wise — who understood what others missed.", weights: { tide: 3, gale: 1 } },
      { text: "Brilliant — who imagined what none had before.", weights: { gale: 3, ember: 1 } },
      { text: "True — whose word was worth a kingdom.", weights: { stone: 3, tide: 1 } }
    ]
  }
];

// answers: array of chosen option-indices (one per question).
// Returns { houseId, scores } — deterministic, with a stable tiebreak.
export function scoreAffinity(answers) {
  const scores = { ember: 0, tide: 0, gale: 0, stone: 0 };
  answers.forEach((choice, qi) => {
    const opt = QUESTIONS[qi] && QUESTIONS[qi].options[choice];
    if (!opt) return;
    for (const [house, w] of Object.entries(opt.weights)) {
      scores[house] += w;
    }
  });

  let best = HOUSE_ORDER[0];
  for (const h of HOUSE_ORDER) {
    if (scores[h] > scores[best]) best = h;
  }
  return { houseId: best, scores };
}
