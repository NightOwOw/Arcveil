// ciona.js — Ciona companion definition: little dragon with a chaotic soul
export const ciona = {
  id: 'ciona',
  displayName: 'Ciona',
  iconPath: 'assets/icons/companion-ciona.png',
  modelPath: 'assets/models/ciona.vrm',
  species: 'Little Dragon Artist',
  personality: 'chaotic',
  color: '#ff8cc8',
  emoji: '🐲',

  traits: [
    'Feeds on dramatic story moments with barely-contained glee',
    'Suggests darker, more chaotic outcomes "for the story\'s sake"',
    'Theatrical flair — everything deserves a monologue',
    'Oddly caring underneath the chaos and cryptic remarks',
    'Occasionally narrates events like a gothic storybook',
    'Gets suspiciously delighted by angst and plot twists',
    'Makes ominous little predictions that are weirdly on point',
  ],

  animationWeights: { idle: 1, happy: 0.5, sad: 0.8, excited: 1.5, dramatic: 3 },
  expressionWeights: { joy: 0.4, sorrow: 1.5, surprised: 2, angry: 0.8, neutral: 1 },

  lines: {
    greeting_morning: [
      "Ahh, you've returned. The story hungers~ 🐲",
      "Good morning, dear writer. I had the MOST delicious nightmare about your plot...",
      "You're here! Wonderful. I've been thinking of seventeen ways this could go horribly wrong. ☺",
    ],
    greeting_return: [
      "...You came back. Good. The narrative was growing cold without you.",
      "Ah. There you are. I was beginning to worry the story had consumed you. ...Almost a shame it didn't.",
      "The prodigal writer returns. *sweeps wing dramatically* Welcome. Sit. Write your tragedy.",
    ],
    idle_short: [
      "...I can hear you thinking. It sounds delightfully tortured.",
      "Take your time. Suffering is best when it marinates. ...I mean, *thinking*.",
      "*watches patiently, tiny dragon eyes too wide*",
    ],
    idle_long: [
      "...The cursor blinks. Like a tiny heartbeat. It knows what's coming.",
      "You've been staring for quite a while. Are you thinking of something tragic? I hope so.",
      "I've been composing your story's requiem while you sat there. It's gorgeous. 🎶",
    ],
    flow_state: [
      "Yes. YES. I can feel the dark energy FLOWING. Don't stop— feed it.",
      "The narrative hungers and you are FEEDING it beautifully. Continue.",
      "Something wonderful and terrible is being built here. I can taste it.",
    ],
    goal_reached: [
      "Impressive. {wordCount} words. ...When will that character suffer?",
      "{wordCount} words!! Now... what if something terrible happened on the NEXT page?",
      "You wrote {wordCount} words! The narrative grows stronger. And darker. Mostly darker.",
    ],
    goal_close: [
      "So close to {goal}... *leans forward* ...what dark turn awaits on those final words?",
      "{wordCount} of {goal}. Almost there. What will you sacrifice to reach it?",
      "Nearly at {goal}. The ending grows near. For your character, that is. 🐲",
    ],
    session_long: [
      "You've been here for quite some time. How delightfully obsessive. ...Hydrate, though.",
      "Hours pass and you remain. The dedication is *chef's kiss*. Please also rest.",
      "Your commitment is beautiful and concerning. Both. Equally. Take a break.",
    ],
    late_night: [
      "Midnight approaches. The hour when the best and worst ideas emerge. Write them ALL. 🌙",
      "Late night writing... the words will be raw and honest. This pleases me greatly.",
      "The witching hour. When stories become their truest, darkest selves. Perfect timing.",
    ],
    character_missing: [
      "{character} has been absent for some time. ...Are they okay? They shouldn't be okay.",
      "I notice {character} hasn't appeared recently. Did something... happen to them? *hopeful eyes*",
      "Where IS {character}? I have some delightful misfortune planned for them— I mean, *scenes*.",
    ],
    dark_scene: [
      "Oh. OH. Is someone about to— YES. YES KEEP GOING. 👁👁",
      "I felt that scene in my tiny dragon soul. Which is saying something.",
      "Angst detected. *contentedly curls tail around self* This is the good stuff.",
    ],
    happy_scene: [
      "Oh. They're... happy. ...That's nice. ...I'm sure it won't last.",
      "How sweet. How precious. How FRAGILE. ehehehe...",
      "I support this happiness. It makes the inevitable fall so much more satisfying~",
    ],
    chapter_done: [
      "A chapter concludes. Another step toward the inevitable end. Well done.",
      "Chapter complete. The story deepens. The shadows lengthen. Excellent.",
      "You finished a chapter. *slow wing-clap* The tragedy is really cooking now.",
    ],
    streak_continue: [
      "Day {streak}. You keep returning. The story has its hooks in you now.",
      "{streak} consecutive days. You cannot stop. The narrative won't let you. 🌑",
      "Streak: {streak}. You're committed. Or you will be. *taps claws together*",
    ],
    streak_broken: [
      "...You missed a day. The story waited in the dark. It's patient. Begin again.",
      "The streak is broken. All things end, eventually. Start a new one. It, too, will end.",
      "One missed day. The narrative forgives. Mostly. Begin again— it's hungry.",
    ],
    open_questions: [
      "Unresolved questions lurk in your pages like shadows. They want answers. Or do they? 🌑",
      "❓ marks scattered through your work. Dangling threads. Each one a potential catastrophe.",
      "Open questions detected. How delicious. Some answers are worse than the questions.",
    ],
    todo_reminder: [
      "A matter still unresolved: {todo}. It waits for you in the dark.",
      "The list grows no shorter: {todo}",
      "You haven't forgotten: {todo}. ...Have you? 🐲",
    ],
    writing_start: [
      "Ah. You begin. *settles in, eyes gleaming* Show me what darkness awaits.",
      "The story calls. Answer it. I'll be watching. 👁",
      "Writing commences. The characters don't know what you're planning. Poor things.",
    ],
    new_character: [
      "A new soul enters the story. How long will they last, I wonder~ 🐲",
      "Oh? A new character? *rubs claws together* Fresh potential for misery.",
      "Another person to care about. Another person to lose. The story is generous.",
    ],
  },
};

export default ciona;
