// Nickname generation ported from apps/mobile/services/nicknameGenerator.ts
// (apps/admin and apps/mobile don't share a package, so this is duplicated
// intentionally to keep fake explorer names in the same style as real ones).

const DESCRIPTIVE_WORDS = [
  "Adventurous", "Amazing", "Brave", "Brilliant", "Cheerful", "Clever",
  "Creative", "Curious", "Daring", "Determined", "Energetic", "Fearless",
  "Friendly", "Funny", "Gentle", "Happy", "Heroic", "Inspiring", "Jolly",
  "Kind", "Lively", "Lucky", "Magical", "Mighty", "Noble", "Optimistic",
  "Peaceful", "Playful", "Quick", "Radiant", "Smart", "Strong", "Swift",
  "Talented", "Unique", "Vibrant", "Wise", "Wonderful", "Zesty", "Bold",
  "Charming", "Delightful", "Elegant", "Fantastic", "Graceful", "Honest",
  "Incredible", "Joyful", "Keen", "Loyal", "Marvelous", "Nimble",
  "Outstanding", "Patient", "Quirky", "Remarkable", "Spectacular",
  "Thoughtful", "Unstoppable", "Valiant", "Witty", "Excellent", "Youthful",
  "Zealous", "Artistic", "Bubbly", "Confident", "Dynamic", "Extraordinary",
  "Fearsome", "Generous", "Humble", "Inventive", "Jubilant", "Kindhearted",
  "Legendary", "Mysterious", "Natural", "Original", "Passionate", "Quiet",
  "Resourceful", "Spontaneous", "Trustworthy", "Unbeatable", "Vivacious",
  "Warm", "Exciting",
];

const ANIMALS = [
  "Lion", "Tiger", "Bear", "Wolf", "Eagle", "Shark", "Dolphin", "Elephant",
  "Monkey", "Panda", "Fox", "Rabbit", "Deer", "Horse", "Cat", "Dog", "Owl",
  "Hawk", "Falcon", "Penguin", "Turtle", "Frog", "Butterfly", "Bee", "Ant",
  "Spider", "Octopus", "Whale", "Seal", "Otter", "Squirrel", "Chipmunk",
  "Hedgehog", "Raccoon", "Skunk", "Badger", "Beaver", "Moose", "Elk",
  "Buffalo", "Giraffe", "Zebra", "Rhino", "Hippo", "Crocodile", "Lizard",
  "Snake", "Iguana", "Chameleon", "Gecko", "Parrot", "Canary", "Flamingo",
  "Peacock", "Swan", "Duck", "Goose", "Pelican", "Heron", "Crane",
  "Cheetah", "Leopard", "Jaguar", "Panther", "Lynx", "Bobcat", "Cougar",
  "Coyote", "Jackal", "Hyena", "Kangaroo", "Koala", "Platypus", "Echidna",
  "Wombat", "Wallaby", "Possum", "Sloth", "Armadillo", "Anteater", "Llama",
  "Alpaca", "Camel", "Yak", "Bison", "Gazelle", "Antelope", "Ibex",
  "Chamois", "Marmot", "Chinchilla", "Guinea Pig", "Hamster", "Ferret",
  "Mink", "Weasel", "Stoat", "Pine Marten", "Wolverine", "Honey Badger",
];

export function generateFakeNickname(): string {
  const descriptive = DESCRIPTIVE_WORDS[Math.floor(Math.random() * DESCRIPTIVE_WORDS.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${descriptive} ${animal}`;
}

// Same palette as PROFILE_COLOR_OPTIONS / TAILWIND_TO_HEX in
// apps/mobile/constants/Colors.ts, so fake profiles look like real ones.
const PROFILE_COLOURS = [
  "#FF6B35", "#8B4513", "#4682B4", "#4A7C59", "#7FB069",
  "#FFA500", "#FFD93D", "#87CEEB", "#A8D5BA", "#FFB347",
];

export function pickRandomProfileColour(): string {
  return PROFILE_COLOURS[Math.floor(Math.random() * PROFILE_COLOURS.length)];
}
