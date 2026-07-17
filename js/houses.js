// houses.js — The four elemental Orders of the Aethelgard Academy of Arcane Arts.
// Fully original naming: no relation to any existing fictional franchise.

export const HOUSES = {
  ember: {
    id: "ember",
    name: "The Order of the Ember",
    element: "Fire",
    virtue: "Courage & Passion",
    tagline: "We are the spark that will not be smothered.",
    blurb:
      "Ember-sworn scholars burn brightly. They act where others hesitate, " +
      "channelling raw feeling into decisive, radiant magic. Reckless, warm, " +
      "and fiercely loyal to a cause once chosen.",
    signatureSpell: "Ignis Flare — a controlled bloom of light drawn from one's own conviction.",
    // Theme colours (CSS custom properties)
    colors: { primary: "#d9552f", glow: "#f0a45a", ink: "#3a1710" },
    personaTone:
      "bold, warm and stirring; speak to courage and the fire of conviction, " +
      "urge the seeker toward decisive action tempered by discipline",
    sigil:
      '<path d="M50 12 C58 30 74 38 66 58 C62 68 54 70 50 82 C46 70 38 68 34 58 C26 38 42 30 50 12 Z" ' +
      'fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M50 40 C54 50 60 52 56 62 C54 68 50 70 50 76 C50 70 46 68 44 62 C40 52 46 50 50 40 Z" ' +
      'fill="currentColor" opacity="0.55"/>'
  },

  tide: {
    id: "tide",
    name: "The Order of the Tide",
    element: "Water",
    virtue: "Insight & Composure",
    tagline: "Still water reflects the deepest truths.",
    blurb:
      "Tide-sworn scholars think in currents. Calm, analytical and patient, " +
      "they read the hidden shape of a problem before ever raising a wand, " +
      "and their magic flows around obstacles rather than through them.",
    signatureSpell: "Aqua Veil — a shimmering barrier that turns force aside like a river 'round stone.",
    colors: { primary: "#2f83b0", glow: "#7cc4e0", ink: "#0f2c3a" },
    personaTone:
      "calm, precise and contemplative; reward analysis and patience, " +
      "invite the seeker to observe deeply before acting",
    sigil:
      '<path d="M18 46 Q34 30 50 46 T82 46" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M18 60 Q34 44 50 60 T82 60" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.75"/>' +
      '<path d="M18 74 Q34 58 50 74 T82 74" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.5"/>'
  },

  gale: {
    id: "gale",
    name: "The Order of the Gale",
    element: "Air",
    virtue: "Curiosity & Wit",
    tagline: "The restless wind visits every locked door.",
    blurb:
      "Gale-sworn scholars chase questions the way the wind chases the horizon. " +
      "Quick, inventive and irreverent, they delight in clever solutions and " +
      "in knowledge for its own bright, weightless sake.",
    signatureSpell: "Kinetic Disarm — a sudden gust of will that plucks an object from a rival's grasp.",
    colors: { primary: "#4aa08f", glow: "#9fe0d1", ink: "#0f302b" },
    personaTone:
      "quick, playful and inquisitive; delight in questions and clever turns, " +
      "encourage the seeker's curiosity and lateral thinking",
    sigil:
      '<path d="M24 40 Q64 30 66 48 Q66 60 48 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M20 58 Q72 46 76 66 Q76 82 50 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.7"/>'
  },

  stone: {
    id: "stone",
    name: "The Order of the Stone",
    element: "Earth",
    virtue: "Constancy & Loyalty",
    tagline: "What is founded well outlasts the ages.",
    blurb:
      "Stone-sworn scholars build to endure. Steadfast, patient and honest, " +
      "they master magic slowly and completely, and are trusted to hold a vow " +
      "long after brighter flames have guttered out.",
    signatureSpell: "Petra Ward — an unyielding anchor of will that cannot be lightly moved.",
    colors: { primary: "#9c7a3c", glow: "#d8bb7a", ink: "#33260f" },
    personaTone:
      "grounded, steady and reassuring; honour patience, craft and loyalty, " +
      "counsel the seeker to build slowly and keep their word",
    sigil:
      '<path d="M50 22 L80 74 L20 74 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M50 46 L66 74 L34 74 Z" fill="currentColor" opacity="0.5"/>'
  }
};

export const HOUSE_ORDER = ["ember", "tide", "gale", "stone"];

export function getHouse(id) {
  return HOUSES[id] || null;
}
