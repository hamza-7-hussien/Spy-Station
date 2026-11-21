import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFK_MAX_MISSED_TURNS,
  DEFAULT_TURN_SECONDS,
  DEFAULT_VOTE_SECONDS,
  EJECTION_CINEMATIC_MS,
  RAPID_TURN_SECONDS,
  areAllEligibleVotesSubmitted,
  computeInitialGameSetup,
  computeNextTurnState,
  getEffectiveTurnSeconds,
  getEligibleVoters,
  getMaxAllowedSpies,
  getMinRequiredPlayers,
  isBotPlayer,
  buildSpyGuessOptions,
  resolveSpyLastChanceGuess,
  resolveVoteOutcome,
  shouldResetGameOverToLobby,
  validateGameStart
} from './gameEngine';
import { CategoryKey, GameMode, PlayerData, RoomData } from './types';
import { CATEGORY_META, getSmartTwinWord, wordsDB } from './words';
import { CATEGORY_STYLES } from './wordVisuals';
import {
  detectClueScriptLanguage,
  evaluatePlayerSuspicionScores,
  generateBotLobbyGreeting,
  generateBotVoteDiscussionLine,
  generateSmartBotClue,
  generateSmartBotCluePair,
  generateSmartBotVote,
  resolveBotClueText,
  resolveViewerClueLanguage
} from './aiBot';

function makePlayers(count: number, botIndices: number[] = []): Record<string, PlayerData> {
  const players: Record<string, PlayerData> = {};
  for (let i = 0; i < count; i++) {
    const isBot = botIndices.includes(i);
    const uid = isBot ? `bot_${i}` : `u_${i}`;
    players[uid] = {
      uid,
      name: isBot ? `Bot ${i}` : `User ${i}`,
      avatar: `https://example.com/${uid}.png`,
      joinedAt: 1000 + i,
      isSpectator: false,
      isBot,
      postGame: null
    };
  }
  return players;
}

function makeRoom(overrides: Partial<RoomData> = {}): RoomData {
  return {
    status: 'waiting',
    hostUid: 'u_0',
    categories: ['players'],
    spyCount: 1,
    maxPlayers: 8,
    turnSeconds: 20,
    visibility: 'public',
    gameMode: 'normal',
    createdAt: 1000,
    players: makePlayers(4),
    ...overrides
  };
}

describe('gameEngine constants & validation', () => {
  it('computes effective turn seconds cleanly without overwriting base duration', () => {
    assert.equal(getEffectiveTurnSeconds('rapid', 30), RAPID_TURN_SECONDS);
    assert.equal(getEffectiveTurnSeconds('normal', 30), 30);
    assert.equal(getEffectiveTurnSeconds('chameleon', undefined), DEFAULT_TURN_SECONDS);
    assert.equal(getEffectiveTurnSeconds('undercover', 2), DEFAULT_TURN_SECONDS);
  });

  it('enforces minimum required players and spy limits for standard vs mole modes', () => {
    assert.equal(getMinRequiredPlayers('normal', 1), 3);
    assert.equal(getMinRequiredPlayers('normal', 2), 4);
    assert.equal(getMinRequiredPlayers('mole', 1), 5);
    assert.equal(getMinRequiredPlayers('mole', 2), 5);
    assert.equal(getMinRequiredPlayers('mole', 3), 7);

    assert.equal(getMaxAllowedSpies('normal', 4), 2);
    assert.equal(getMaxAllowedSpies('mole', 4), 1);
    assert.equal(getMaxAllowedSpies('mole', 5), 2);
  });

  it('validates game start properly across waiting and post-game rooms', () => {
    const tooFewMole = makeRoom({ gameMode: 'mole', spyCount: 2, players: makePlayers(4) });
    const res1 = validateGameStart(tooFewMole);
    assert.equal(res1.ok, false);
    assert.equal(res1.reason, 'not_enough_players');
    assert.equal(res1.minRequired, 5);

    const gameoverNotInLobby = makeRoom({
      status: 'gameover',
      players: {
        u_0: { uid: 'u_0', name: 'A', avatar: '', postGame: 'inLobby' },
        u_1: { uid: 'u_1', name: 'B', avatar: '', postGame: null },
        bot_2: { uid: 'bot_2', name: 'Bot', avatar: '', isBot: true }
      }
    });
    const res2 = validateGameStart(gameoverNotInLobby);
    assert.equal(res2.ok, false);
    assert.equal(res2.reason, 'players_not_in_lobby');

    const readyRoom = makeRoom({
      status: 'gameover',
      players: {
        u_0: { uid: 'u_0', name: 'A', avatar: '', postGame: 'inLobby' },
        u_1: { uid: 'u_1', name: 'B', avatar: '', postGame: 'inLobby' },
        bot_2: { uid: 'bot_2', name: 'Bot', avatar: '', isBot: true }
      }
    });
    assert.equal(validateGameStart(readyRoom).ok, true);
  });
});

describe('computeInitialGameSetup across all 5 active game modes', () => {
  const modes: GameMode[] = [
    'normal',
    'chameleon',
    'rapid',
    'mole',
    'undercover'
  ];

  modes.forEach(mode => {
    it(`initializes ${mode} mode with valid roles, turn order, and reset flags`, () => {
      const players = makePlayers(mode === 'mole' ? 6 : 5, [3, 4]);
      // Simulate leftover state from a previous match
      players.u_0.isSpectator = true;
      players.u_0.isSilenced = true;
      players.u_0.disqualifiedVote = true;
      players.u_0.missedTurns = 2;

      const room = makeRoom({
        gameMode: mode,
        spyCount: mode === 'mole' ? 2 : 1,
        turnSeconds: 25,
        players
      });

      const setup = computeInitialGameSetup({
        room,
        wordPair: ['Messi', 'ميسي'],
        wordCategory: 'players',
        chameleonPair: ['Ronaldo', 'رونالدو'],
        randomFn: () => 0.25
      });

      assert.equal(setup.spies.length, mode === 'mole' ? 2 : 1);
      assert.equal(setup.turnOrder.length, Object.keys(players).length);
      assert.equal(new Set(setup.turnOrder).size, Object.keys(players).length);
      assert.equal(setup.turnTimeLeft, mode === 'rapid' ? RAPID_TURN_SECONDS : 25);

      Object.values(setup.players).forEach(p => {
        assert.equal(p.isSpectator, false);
        assert.equal(p.isSilenced, false);
        assert.equal(p.disqualifiedVote, false);
        assert.equal(p.missedTurns, 0);
        if (mode === 'chameleon' && setup.spies.includes(p.uid)) {
          assert.equal(p.chameleonWord, 'Ronaldo');
          assert.equal(p.chameleonWordAr, 'رونالدو');
        } else {
          assert.equal(p.chameleonWord, undefined);
        }
      });

      if (mode === 'undercover') {
        assert.ok(setup.undercoverUid);
        assert.equal(setup.spies.includes(setup.undercoverUid!), false);
        assert.equal(setup.players[setup.undercoverUid!].role, 'undercover');
      } else {
        assert.equal(setup.undercoverUid, null);
      }

      // Deterministic sequential turn order matching joinedAt seat order regardless of randomFn
      assert.deepEqual(
        setup.turnOrder,
        Object.values(setup.players)
          .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
          .map(p => p.uid)
      );
    });
  });
});

describe('computeNextTurnState, AFK auto-kick, and round progression', () => {
  it('enforces strictly 1 turn per active player per round and keeps sequential turnOrder fixed on next round', () => {
    let room = makeRoom({
      status: 'playing',
      round: 1,
      turnOrder: ['u_0', 'u_1', 'u_2', 'u_3'],
      turnIndex: 0,
      turnTimeLeft: 12
    });

    const speakers: string[] = [];
    for (let step = 0; step < 4; step++) {
      speakers.push(room.turnOrder![room.turnIndex!]);
      const res = computeNextTurnState(room, { expectedTurnIndex: room.turnIndex, wasTimeout: false });
      assert.equal(res.changed, true);
      room = res.room;
    }

    assert.deepEqual(speakers, ['u_0', 'u_1', 'u_2', 'u_3']);
    assert.equal(room.round, 2);
    assert.equal(room.turnIndex, 0);
    assert.equal(room.blackoutActive, false);
    assert.equal(room.currentDrawing, null);
    assert.equal(room.completedTurnsThisRound, undefined);
    // Strict fixed sequential order across all rounds
    assert.deepEqual(room.turnOrder, ['u_0', 'u_1', 'u_2', 'u_3']);
  });

  it('rejects stale turn advancement when expectedTurnIndex or expectedRound mismatches', () => {
    const room = makeRoom({
      status: 'playing',
      round: 2,
      turnOrder: ['u_0', 'u_1', 'u_2'],
      turnIndex: 1
    });
    const staleIdx = computeNextTurnState(room, { expectedTurnIndex: 0, expectedRound: 2, wasTimeout: false });
    assert.equal(staleIdx.changed, false);

    const staleRound = computeNextTurnState(room, { expectedTurnIndex: 1, expectedRound: 1, wasTimeout: false });
    assert.equal(staleRound.changed, false);
  });

  it('auto-converts player to spectator after 3 consecutive timed-out turns and resets streak on active play', () => {
    let room = makeRoom({
      status: 'playing',
      round: 1,
      turnOrder: ['u_0', 'u_1', 'u_2'],
      turnIndex: 0
    });

    // Miss 1 -> u_0 missedTurns becomes 1
    let res = computeNextTurnState(room, { expectedTurnIndex: 0, wasTimeout: true });
    assert.equal(res.room.players!.u_0.missedTurns, 1);
    assert.equal(res.room.players!.u_0.isSpectator, false);

    // Miss 2 -> simulate u_0 turn again
    room = { ...res.room, turnIndex: 0, turnOrder: ['u_0', 'u_1', 'u_2'], completedTurnsThisRound: undefined };
    res = computeNextTurnState(room, { expectedTurnIndex: 0, wasTimeout: true });
    assert.equal(res.room.players!.u_0.missedTurns, 2);

    // Active clue resets missedTurns to 0
    room = { ...res.room, turnIndex: 0, turnOrder: ['u_0', 'u_1', 'u_2'], completedTurnsThisRound: undefined };
    res = computeNextTurnState(room, { expectedTurnIndex: 0, wasTimeout: false });
    assert.equal(res.room.players!.u_0.missedTurns, 0);

    // Now miss 3 consecutive turns -> kicked on the 3rd
    for (let m = 1; m <= AFK_MAX_MISSED_TURNS; m++) {
      room = { ...res.room, turnIndex: 0, turnOrder: ['u_0', 'u_1', 'u_2'], completedTurnsThisRound: undefined };
      res = computeNextTurnState(room, { expectedTurnIndex: 0, wasTimeout: true });
      if (m < AFK_MAX_MISSED_TURNS) {
        assert.equal(res.afkKickedName, null);
        assert.equal(res.room.players!.u_0.isSpectator, false);
      } else {
        assert.equal(res.afkKickedName, 'User 0');
        assert.equal(res.room.players!.u_0.isSpectator, true);
      }
    }
  });
});

describe('Voting resolution & survivor parity rules', () => {

  it('excludes disqualifiedVote players from eligible voters so voting never hangs', () => {
    const players = makePlayers(4);
    players.u_3.disqualifiedVote = true;

    const room = makeRoom({
      status: 'voting',
      players,
      votes: { u_0: 'u_1', u_1: 'u_2', u_2: 'u_1' }
    });

    assert.equal(getEligibleVoters(players).length, 3);
    assert.equal(areAllEligibleVotesSubmitted(room), true);
  });

  it('handles zero-vote timeout, ties, ejection cinematic pause, and standard vs mole parity win rules', () => {
    // 1. Zero valid votes -> nobody ejected & round increments cleanly
    const emptyVoteRoom = makeRoom({
      status: 'voting',
      round: 1,
      spies: ['u_3'],
      players: makePlayers(4),
      votes: null,
      voteTimeLeft: 12
    });
    const emptyRes = resolveVoteOutcome(emptyVoteRoom, 10000);
    assert.equal(emptyRes.outcome, 'nobody_ejected');
    assert.equal(emptyRes.nextRoomFields.round, 2);
    assert.equal(emptyRes.nextRoomFields.status, 'playing');
    assert.equal(emptyRes.nextRoomFields.voteTimeLeft, null);

    // 2. Tie vote -> nobody ejected
    const tieRoom = makeRoom({
      status: 'voting',
      round: 1,
      spies: ['u_3'],
      players: makePlayers(4),
      votes: { u_0: 'u_1', u_1: 'u_3', u_2: 'u_1', u_3: 'u_3' }
    });
    assert.equal(resolveVoteOutcome(tieRoom, 10000).outcome, 'nobody_ejected');

    // 3. Last spy ejected -> crew win
    const crewWinRoom = makeRoom({
      status: 'voting',
      round: 1,
      spies: ['u_3'],
      players: makePlayers(4),
      votes: { u_0: 'u_3', u_1: 'u_3', u_2: 'u_3', u_3: 'u_0' }
    });
    const crewRes = resolveVoteOutcome(crewWinRoom, 10000);
    assert.equal(crewRes.outcome, 'crew_win');
    assert.equal(crewRes.nextRoomFields.status, 'gameover');
    assert.equal(crewRes.nextRoomFields.winnerTeam, 'crew');
    assert.equal(crewRes.nextRoomFields.voteTimeLeft, null);

    // 4. 3-player game: ejecting an innocent leaves 1 spy vs 1 crew (< 3 active players), so spies win immediately without aborting to lobby!
    const threePlayers = makePlayers(3);
    const threePlayerRoom = makeRoom({
      gameMode: 'normal',
      status: 'voting',
      round: 1,
      spies: ['u_2'],
      players: threePlayers,
      votes: { u_0: 'u_1', u_1: 'u_2', u_2: 'u_1' }
    });
    const threeRes = resolveVoteOutcome(threePlayerRoom, 10000);
    assert.equal(threeRes.outcome, 'spies_win');
    assert.equal(threeRes.nextRoomFields.status, 'gameover');
    assert.equal(threeRes.nextRoomFields.winnerTeam, 'spies');

    // 5. 4-player game: ejecting 1 innocent leaves 1 spy vs 2 crew -> continues with ejection cinematic pause
    const fourPlayers = makePlayers(4);
    const stdContinueRoom = makeRoom({
      gameMode: 'normal',
      status: 'voting',
      round: 1,
      spies: ['u_3'],
      players: fourPlayers,
      votes: { u_0: 'u_1', u_1: 'u_3', u_2: 'u_1', u_3: 'u_1' }
    });
    const stdContinue = resolveVoteOutcome(stdContinueRoom, 10000);
    assert.equal(stdContinue.outcome, 'innocent_ejected_continue');
    assert.equal(stdContinue.nextRoomFields.ejectionEndsAt, 10000 + EJECTION_CINEMATIC_MS + 300);

    // 6. Mole parity: 4 players, ejecting 1 innocent leaves 1 spy vs 2 crew -> wait; 3 players spy parity -> spies win
    const moleParityRoom = makeRoom({
      gameMode: 'mole',
      status: 'voting',
      round: 1,
      spies: ['u_2'],
      players: threePlayers,
      votes: { u_0: 'u_1', u_1: 'u_2', u_2: 'u_1' }
    });
    const moleWin = resolveVoteOutcome(moleParityRoom, 10000);
    assert.equal(moleWin.outcome, 'spies_win');
    assert.equal(moleWin.nextRoomFields.winnerTeam, 'spies');
  });

  it('detects gameover return-to-lobby completion correctly when bots exist or players leave', () => {
    const waitingPlayers = {
      u_0: { uid: 'u_0', name: 'A', avatar: '', postGame: 'inLobby' as const },
      u_1: { uid: 'u_1', name: 'B', avatar: '', postGame: null },
      bot_2: { uid: 'bot_2', name: 'Bot', avatar: '', isBot: true, postGame: null }
    };
    assert.equal(shouldResetGameOverToLobby(waitingPlayers), false);

    // Once u_1 leaves, remaining human u_0 is already inLobby (bot doesn't block)
    const afterU1Left = { u_0: waitingPlayers.u_0, bot_2: waitingPlayers.bot_2 };
    assert.equal(shouldResetGameOverToLobby(afterU1Left), true);
    assert.equal(isBotPlayer(waitingPlayers.bot_2), true);
    assert.equal(DEFAULT_VOTE_SECONDS, 45);
  });
});

describe('wordsDB & getSmartTwinWord integrity (Chameleon mode)', () => {
  it('always produces a distinct twin word inside the same category for every word entry', () => {
    const categories = Object.keys(wordsDB) as CategoryKey[];
    for (const cat of categories) {
      const list = wordsDB[cat];
      assert.ok(list.length >= 2, `Category ${cat} should have at least 2 words`);
      for (const pair of list) {
        const twin = getSmartTwinWord(pair, cat, list);
        assert.notEqual(
          twin[0].toLowerCase(),
          pair[0].toLowerCase(),
          `Twin for "${pair[0]}" in ${cat} matched itself`
        );
        const existsInCategory = list.some(entry => entry[0] === twin[0]);
        assert.equal(
          existsInCategory,
          true,
          `Twin "${twin[0]}" for "${pair[0]}" missing from ${cat} list`
        );
      }
    }
  });
});

describe('AI Bot clues, Chameleon decoy clues, and voting', () => {
  it('generates a strictly single-word clue that never reveals the secret or decoy word', () => {
    const clue = generateSmartBotClue({
      isSpy: true,
      word: 'Messi',
      wordAr: 'ميسي',
      category: 'players',
      language: 'ar',
      previousClues: [],
      gameMode: 'chameleon',
      chameleonWord: 'Ronaldo',
      chameleonWordAr: 'رونالدو'
    });
    assert.ok(clue.length > 0);
    assert.equal(/\s/.test(clue), false);
    assert.notEqual(clue, 'رونالدو');
    assert.notEqual(clue, 'ميسي');
  });

  it('never causes spy bots to vote for themselves or fellow spies when innocents remain', () => {
    const players = Object.values(makePlayers(5, [0, 1, 2]));
    const spies = ['bot_0', 'bot_1'];
    for (let i = 0; i < 20; i++) {
      const target = generateSmartBotVote({
        botUid: 'bot_0',
        isSpy: true,
        activePlayers: players,
        spies
      });
      assert.equal(spies.includes(target), false);
    }
  });

  it('adapts spy bot clues contextually in Arabic and deduces suspicious generic clues when crew votes', () => {
    const contextClue = generateSmartBotClue({
      isSpy: true,
      word: 'Koshary',
      wordAr: 'كشري',
      category: 'food',
      language: 'ar',
      previousClues: ['مصري', 'شعبي']
    });
    assert.ok(contextClue.length > 0);
    assert.equal(/\s/.test(contextClue), false);
    assert.notEqual(contextClue, 'مصري');

    const players = Object.values(makePlayers(4, [0, 1, 2, 3]));
    const spies = ['bot_2'];
    const gameChat = {
      m1: { uid: 'bot_0', text: 'مكرونة' },
      m2: { uid: 'bot_1', text: 'دقة' },
      m3: { uid: 'bot_2', text: 'معروف' },
      m4: { uid: 'bot_3', text: 'عدس' }
    };

    const scores = evaluatePlayerSuspicionScores({
      activePlayers: players,
      spies,
      gameChat,
      word: 'Koshary',
      wordAr: 'كشري',
      wordCategory: 'food'
    });
    assert.ok(scores.bot_2 > scores.bot_0);
    assert.ok(scores.bot_2 > scores.bot_1);

    const voteTarget = generateSmartBotVote({
      botUid: 'bot_0',
      isSpy: false,
      activePlayers: players,
      spies,
      gameChat,
      word: 'Koshary',
      wordAr: 'كشري',
      wordCategory: 'food'
    });
    assert.equal(voteTarget, 'bot_2');

    const greeting = generateBotLobbyGreeting('ar');
    assert.ok(greeting.length > 0);

    const voteLine = generateBotVoteDiscussionLine({
      botUid: 'bot_0',
      isSpy: false,
      targetUid: 'bot_2',
      activePlayers: players,
      gameChat,
      lang: 'ar'
    });
    assert.ok(voteLine && voteLine.includes('Bot 2'));
  });

  it('protects real spies when an Undercover bot votes and never returns SKIP', () => {
    const players = Object.values(makePlayers(5, [0, 1, 2]));
    const spies = ['bot_1'];
    for (let i = 0; i < 20; i++) {
      const target = generateSmartBotVote({
        botUid: 'bot_0',
        isSpy: false,
        isUndercover: true,
        activePlayers: players,
        spies
      });
      assert.notEqual(target, 'SKIP');
      assert.notEqual(target, 'bot_1');
      assert.notEqual(target, 'bot_0');
    }

    // Even if all other players are spies, never return SKIP
    const twoPlayers = Object.values(makePlayers(2, [0, 1]));
    const fallbackTarget = generateSmartBotVote({
      botUid: 'bot_0',
      isSpy: false,
      isUndercover: true,
      activePlayers: twoPlayers,
      spies: ['bot_1']
    });
    assert.equal(fallbackTarget, 'bot_1');
  });
});

describe('Expanded word banks, category emojis, and Turn Timer deadlines', () => {
  it('ensures every category has >= 100 words and a representative emoji icon', () => {
    const expectedCategories: CategoryKey[] = [
      'players', 'food', 'places', 'movies', 'games', 'animals', 'jobs', 'singers'
    ];
    for (const cat of expectedCategories) {
      assert.ok(wordsDB[cat].length >= 100, `Expected ${cat} >= 100 words, got ${wordsDB[cat].length}`);
      assert.ok(CATEGORY_META[cat].icon.trim().length > 0, `CATEGORY_META[${cat}].icon missing`);
      assert.ok(CATEGORY_STYLES[cat].icon.trim().length > 0, `CATEGORY_STYLES[${cat}].icon missing`);
    }
  });

  it('sets turnEndsAt cleanly across sequential turns without shifting player order', () => {
    const room = makeRoom({
      status: 'playing',
      gameMode: 'normal',
      round: 1,
      turnSeconds: 20,
      turnOrder: ['u_0', 'u_1', 'u_2', 'u_3'],
      turnIndex: 0
    });

    const step1 = computeNextTurnState(room, {
      expectedTurnIndex: 0,
      now: 50000
    });
    assert.equal(step1.changed, true);
    assert.equal(step1.room.turnIndex, 1);
    assert.equal(step1.room.turnGraceUntil, null);
    assert.equal(step1.room.turnEndsAt, 50000 + 20000);
    assert.deepEqual(step1.room.turnOrder, ['u_0', 'u_1', 'u_2', 'u_3']);
  });
});

describe('Bilingual AI Bot clue pairs & per-player per-round script detection', () => {
  it('generates paired Arabic & English single-word clues without leaking secret or duplicate words', () => {
    const pair = generateSmartBotCluePair({
      isSpy: false,
      word: 'Messi',
      wordAr: 'ميسي',
      category: 'players',
      language: 'en',
      previousClues: ['dribbler', 'مراوغ']
    });
    assert.ok(pair.ar.length > 0);
    assert.ok(pair.en.length > 0);
    assert.equal(/\s/.test(pair.ar), false);
    assert.equal(/\s/.test(pair.en), false);
    assert.match(pair.ar, /[\u0600-\u06FF]/);
    assert.match(pair.en, /[A-Za-z]/);
    assert.notEqual(pair.en.toLowerCase(), 'dribbler');
    assert.notEqual(pair.ar, 'مراوغ');
  });

  it('detects clue writing language per player per round independently of each player UI language', () => {
    const botClueR1 = {
      uid: 'bot_1',
      isBot: true,
      text: 'legend',
      translations: { ar: 'أسطورة', en: 'legend' },
      round: 1,
      timestamp: 300
    };
    const botClueR2 = {
      uid: 'bot_1',
      isBot: true,
      text: 'trophy',
      translations: { ar: 'بطولة', en: 'trophy' },
      round: 2,
      timestamp: 600
    };

    const gameChat = {
      // Round 1: Player A (UI = en) writes Arabic, Player B (UI = ar) writes English
      c1: { uid: 'u_A', text: 'لاعب', isBot: false, round: 1, timestamp: 100 },
      c2: { uid: 'u_B', text: 'goal', isBot: false, round: 1, timestamp: 200 },
      c3: botClueR1,
      // Round 2: Player A switches to English, Player B switches to Arabic
      c4: { uid: 'u_A', text: 'striker', isBot: false, round: 2, timestamp: 400 },
      c5: { uid: 'u_B', text: 'كأس', isBot: false, round: 2, timestamp: 500 },
      c6: botClueR2
    };

    assert.equal(detectClueScriptLanguage('أسطورة'), 'ar');
    assert.equal(detectClueScriptLanguage('legend'), 'en');
    assert.equal(detectClueScriptLanguage('⏩'), null);

    // Round 1: A wrote Arabic -> sees أسطورة; B wrote English -> sees legend
    const r1LangA = resolveViewerClueLanguage({ viewerUid: 'u_A', round: 1, gameChat, fallbackLang: 'en' });
    const r1LangB = resolveViewerClueLanguage({ viewerUid: 'u_B', round: 1, gameChat, fallbackLang: 'ar' });
    assert.equal(r1LangA, 'ar');
    assert.equal(r1LangB, 'en');
    assert.equal(resolveBotClueText(botClueR1, r1LangA), 'أسطورة');
    assert.equal(resolveBotClueText(botClueR1, r1LangB), 'legend');

    // Round 2: A switched to English -> sees trophy; B switched to Arabic -> sees بطولة
    const r2LangA = resolveViewerClueLanguage({ viewerUid: 'u_A', round: 2, gameChat, fallbackLang: 'en' });
    const r2LangB = resolveViewerClueLanguage({ viewerUid: 'u_B', round: 2, gameChat, fallbackLang: 'ar' });
    assert.equal(r2LangA, 'en');
    assert.equal(r2LangB, 'ar');
    assert.equal(resolveBotClueText(botClueR2, r2LangA), 'trophy');
    assert.equal(resolveBotClueText(botClueR2, r2LangB), 'بطولة');
  });
});

describe('Spy Last-Chance Guess mechanics & Custom Category option pools', () => {
  it('transitions to spy_guess with 6 options including the secret word when allowSpyLastChance is enabled', () => {
    const players = makePlayers(4);
    const customWords = [
      { en: 'Naruto', ar: 'ناروتو' },
      { en: 'Luffy', ar: 'لوفي' },
      { en: 'Goku', ar: 'غوكو' },
      { en: 'Ichigo', ar: 'إيتشيغو' },
      { en: 'Eren', ar: 'إيرين' },
      { en: 'Gon', ar: 'غون' },
      { en: 'Saitama', ar: 'سايتاما' }
    ];
    const room = makeRoom({
      status: 'voting',
      allowSpyLastChance: true,
      word: 'Naruto',
      wordAr: 'ناروتو',
      customCategoryWords: customWords,
      players,
      spies: ['u_3'],
      votes: { u_0: 'u_3', u_1: 'u_3', u_2: 'u_3', u_3: 'u_0' }
    });

    const outcome = resolveVoteOutcome(room, 10000);
    assert.equal(outcome.outcome, 'spy_last_chance');
    assert.equal(outcome.nextRoomFields.status, 'spy_guess');
    assert.equal(outcome.nextRoomFields.spyGuessCandidateUid, 'u_3');
    assert.deepEqual(outcome.nextRoomFields.finalSpies, ['u_3']);
    const opts = outcome.nextRoomFields.spyGuessOptions || [];
    assert.equal(opts.length, 6);
    assert.ok(opts.some(o => o.en === 'Naruto'));
  });

  it('awards victory to spies when the caught spy guesses correctly, and to crew on miss or timeout', () => {
    const players = makePlayers(4);
    const room = makeRoom({
      status: 'spy_guess',
      word: 'Pyramids',
      wordAr: 'الأهرامات',
      spyGuessCandidateUid: 'u_3',
      spies: [],
      finalSpies: ['u_3'],
      finalPlayers: players,
      spyGuessOptions: buildSpyGuessOptions(
        makeRoom({ word: 'Pyramids', wordAr: 'الأهرامات', wordCategory: 'places' })
      )
    });

    const winRes = resolveSpyLastChanceGuess(room, 'Pyramids');
    assert.equal(winRes.isCorrect, true);
    assert.equal(winRes.winnerTeam, 'spies');
    assert.equal(winRes.nextRoomFields.status, 'gameover');
    assert.equal(winRes.nextRoomFields.winnerTeam, 'spies');

    const missRes = resolveSpyLastChanceGuess(room, 'London');
    assert.equal(missRes.isCorrect, false);
    assert.equal(missRes.winnerTeam, 'crew');
    assert.equal(missRes.nextRoomFields.status, 'gameover');

    const timeoutRes = resolveSpyLastChanceGuess(room, null);
    assert.equal(timeoutRes.isCorrect, false);
    assert.equal(timeoutRes.winnerTeam, 'crew');
    assert.equal(timeoutRes.nextRoomFields.spyGuessResult?.guessedWord, '');
  });
});


