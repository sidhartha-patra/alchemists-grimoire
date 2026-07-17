// chronicle.js — The Daily Chronicle: hidden chapters of Aethelgard's history,
// unlocked as the seeker earns Aura by conversing with the Founder's Echo.

// Each chapter has an auraRequired threshold. The final chapter is house-specific.
export const CHAPTERS = [
  {
    id: "ch1",
    title: "I. The Founding Vow",
    auraRequired: 0,
    body:
      "Five hundred winters ago, Archmage Ignatius Vale climbed a mountain that " +
      "held no name and planted a staff of blackthorn in its summit. \"Let there be " +
      "a place,\" he said to the empty wind, \"where the curious are not burned for " +
      "their curiosity.\" By spring the first walls of Aethelgard had risen from the " +
      "living rock, and the Academy of Arcane Arts took its first breath."
  },
  {
    id: "ch2",
    title: "II. The Four Sigils",
    auraRequired: 25,
    body:
      "Vale believed no single temperament could hold all of magic. So he cut four " +
      "sigils into the great doors — Ember, Tide, Gale and Stone — and swore that each " +
      "seeker would find their truest Order not by birth or gold, but by the shape of " +
      "their own heart. The Affinity Ritual you have passed is older than any throne " +
      "still standing."
  },
  {
    id: "ch3",
    title: "III. The Whispering Stacks",
    auraRequired: 60,
    body:
      "The Academy's library was never silent. Its shelves rearranged themselves by " +
      "moonlight, and a book that wished to be read would drift, page-fluttering, into " +
      "a scholar's lap. It is said Vale taught the volumes to drink stray ink from the " +
      "air — which is why, to this day, a grimoire of Aethelgard swallows what is written " +
      "upon it and answers in a hand of its own."
  },
  {
    id: "ch4",
    title: "IV. The Sundering",
    auraRequired: 110,
    body:
      "Not every chapter of Aethelgard is gentle. In Vale's later years a rival circle, " +
      "the Grey Concord, sought to bind magic to obedience and scholars to fear. The " +
      "Sundering that followed cost the Academy its eastern towers and half its founding " +
      "masters. Vale survived — but he understood, at last, that he would not always be " +
      "there to guide those who came after."
  },
  {
    id: "ch5",
    title: "V. The Bound Echo",
    auraRequired: 175,
    body:
      "And so the Archmage performed his final, tender work of magic. He did not hide " +
      "his soul in some dark vessel, as the Grey Concord had — he pressed only an *echo* " +
      "of his voice, his patience and his teaching into a single grimoire, that it might " +
      "mentor seekers long after his hand had stilled. The book you hold is that echo. " +
      "You are not speaking to a ghost. You are speaking to a lesson he refused to let die."
  },
  {
    id: "ch6",
    title: "VI. Your Order's Secret",
    auraRequired: 260,
    // Body chosen per house at render time (see byHouse).
    byHouse: {
      ember:
        "To the Ember alone Vale confided this: the flame he feared was never wildfire, " +
        "but the ember that forgets why it burns. \"Carry a reason,\" he wrote, \"and your " +
        "fire will warm a hall instead of razing it.\"",
      tide:
        "To the Tide alone Vale confided this: the deepest water is not the coldest. " +
        "\"Do not mistake stillness for distance,\" he wrote. \"See clearly — then let what " +
        "you see move you to act.\"",
      gale:
        "To the Gale alone Vale confided this: the wind that touches every door must " +
        "still choose one to enter. \"Wonder at everything,\" he wrote, \"but finish " +
        "something. A question left forever open is only a beautiful excuse.\"",
      stone:
        "To the Stone alone Vale confided this: even mountains are patient with the rain " +
        "that wears them. \"Endure,\" he wrote, \"but do not harden past all changing. The " +
        "loyalty that will not learn becomes a prison you built yourself.\""
    }
  }
];

// Returns the list of chapters unlocked at the given aura, with resolved bodies.
export function unlockedChapters(aura, houseId) {
  return CHAPTERS
    .filter((c) => aura >= c.auraRequired)
    .map((c) => ({
      id: c.id,
      title: c.title,
      auraRequired: c.auraRequired,
      body: c.byHouse ? (c.byHouse[houseId] || firstOf(c.byHouse)) : c.body
    }));
}

// The next locked chapter, or null if all are unlocked.
export function nextChapter(aura) {
  return CHAPTERS.find((c) => aura < c.auraRequired) || null;
}

function firstOf(obj) {
  const k = Object.keys(obj)[0];
  return obj[k];
}
