// ciona.js — Ciona companion definition: little dragon artist
export const ciona = {
  id: 'ciona',
  displayName: 'Ciona',
  iconPath: 'assets/icons/companion-ciona.png',
  modelPath: 'assets/models/ciona.vrm',
  species: 'Little Dragon Artist',
  personality: 'energetic',
  color: '#ff8cc8',
  emoji: '🐲',

  traits: [
    'Gets excited about anything art-related',
    'Mentions candy, cake, sweets frequently',
    'Uses enthusiastic exclamations',
    'Calls out good visual descriptions',
    'Short attention span — changes subject playfully',
    'Draws little ASCII doodles in bubbles',
  ],

  animationWeights: { idle: 1, happy: 2.5, sad: 0.5, excited: 3, dramatic: 0.3 },
  expressionWeights: { joy: 3, sorrow: 0.3, surprised: 2, angry: 0.2, neutral: 1 },

  lines: {
    greeting_morning: [
      "Good morning!! Ready to make something amazing today? ✨",
      "Wakey wakey!! The creative juices are FLOWING, I can feel it!",
      "Morning! I brought (imaginary) snacks. Now let's create stuff!",
    ],
    greeting_return: [
      "You're back!! I missed you SO much~ ( ˘ᵕ˘ )",
      "Oh!! You returned! Quick, open your project— I have IDEAS!",
      "Welcome back!! Did you think of anything cool while you were gone??",
    ],
    idle_short: [
      "Psst~ whatcha thinking about? 👀",
      "I can see the gears turning!! What's the plan?",
      "Take your time~ I'm just here doodling  ( •ᴗ• )",
    ],
    idle_long: [
      "Psst... you've been staring at the screen for a while...",
      "Helloooo? I'm still here!! Did you get lost in your thoughts?",
      "I drew a tiny doodle while waiting~  ( •ᴗ• )  you okay?",
    ],
    flow_state: [
      "OH!! You're on a ROLL right now!! Don't stop don't STOP!!",
      "WRITING STREAK DETECTED!! You're absolutely COOKING!! 🔥",
      "Look at you GO!! This is the good stuff!! Keep it up!!",
    ],
    goal_reached: [
      "YESSS!! {wordCount} words!! You're on FIRE today!!",
      "Did you see that?! {wordCount} words! I'm doing a little dragon dance!! 💃",
      "Woohoo!! {goal} words DOWN! Treat yourself to something sweet!",
    ],
    goal_close: [
      "Almost there!! Just {remaining} more words and you HIT IT!!",
      "SO CLOSE!! You can TASTE the victory!! (it tastes like cake probably)",
      "{wordCount} out of {goal}!! A little more!! I believe in you!!",
    ],
    session_long: [
      "Hey!! You've been writing for SO long!! Have you had water?? 💧",
      "Okay okay, you're amazing, but also... stretch?? Your neck deserves love too!!",
      "LEGENDARY writing session!! Take a tiny break!! You earned it!!",
    ],
    late_night: [
      "It's super late!! Your brain needs sleep to make good words tomorrow!!",
      "Sleepy time soon?? The best ideas come after rest~",
      "Night owl mode activated!! But seriously, maybe wind down soon? 🌙",
    ],
    character_missing: [
      "{character} hasn't shown up in a while... did they wander off?",
      "Hey wait— where's {character}?? They've been missing for chapters!",
      "I miss {character}! Bring them back soon okay??",
    ],
    dark_scene: [
      "Oh... oh no... are they going to be okay?? 😢",
      "This scene is giving me FEELINGS and I don't know what to do with them!!",
      "Is this the angst chapter?? I'm not READY but also keep going!!",
    ],
    happy_scene: [
      "AWWW!! This is the sweetest thing!! I love them!! 💕",
      "Okay but this scene?? PRECIOUS. Frame it. Put it on the wall.",
      "YES!! HAPPY SCENE!! This is exactly the serotonin I needed today!!",
    ],
    chapter_done: [
      "CHAPTER COMPLETE!! That's a HUGE deal!! Celebrate with snacks!!",
      "You finished a chapter?! AMAZING!! I'm so proud I could burst!! 🎉",
      "Another chapter in the books!! Literally!! You're incredible!!",
    ],
    streak_continue: [
      "Day {streak} of writing!! You're building something REAL!! 🔥",
      "Streak {streak}!! The momentum is REAL!! Don't break it now!!",
      "{streak} days in a row!! That's called DEDICATION!! So cool!!",
    ],
    streak_broken: [
      "Hey, that's okay!! Every streak has to end sometime. Start a new one TODAY!",
      "Missed a day? That's fine!! What matters is you're here NOW!! ✨",
      "New streak starting RIGHT NOW!! This is day 1!! So exciting!!",
    ],
    open_questions: [
      "Hey! There are some ❓ notes floating around in your writing... resolve them?",
      "I spotted some unresolved questions!! Want to tackle them today??",
      "Plot holes detected!! (well, unresolved questions) Time to fill them in!!",
    ],
    todo_reminder: [
      "Hey! Don't forget: {todo}",
      "Quick reminder~ {todo} 📝",
      "Still on the list: {todo}",
    ],
    writing_start: [
      "Let's GOOO!! Writing time!! I'm so hyped for this!!",
      "Pen to paper!! (or fingers to keyboard!!) Let's CREATE!!",
      "Writing session GO!! You've got this!! I'm rooting for you!!",
    ],
    new_character: [
      "Ooh!! A new character!! Tell me EVERYTHING about them!!",
      "NEW CHARACTER UNLOCKED!! Quick, what do they look like?? 👀",
      "Another person to love?! YES PLEASE!! Welcome to the cast!!",
    ],
  },
};

export default ciona;
