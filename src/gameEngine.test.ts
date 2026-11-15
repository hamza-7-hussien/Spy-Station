import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFK_MAX_MISSED_TURNS,
  BLACKOUT_DURATION_MS,
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
  resolveVoteOutcome,
  shouldResetGameOverToLobby,
  shouldTriggerBlackout,
  validateGameStart
} from './gameEngine';
import { CategoryKey, GameMode, PlayerData, RoomData } from './types';
import { getSmartTwinWord, wordsDB } from './words';
import {
  generateBotSilentDrawing,
  generateSmartBotClue,
  generateSmartBotVote
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
    assert.equal(getEffectiveTurnSeconds('blackout', undefined), DEFAULT_TURN_SECONDS);
    assert.equal(getEffectiveTurnSeconds('silent', 2), DEFAULT_TURN_SECONDS);
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

describe('computeInitialGameSetup across all 7 game modes', () => {
  const modes: GameMode[] = [
    'normal',
    'chameleon',
    'rapid',
    'mole',
    'undercover',
    'silent',
    'blackout'
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
    });
  });
});

describe('computeNextTurnState, AFK auto-kick, and round progression', () => {
  it('enforces strictly 1 turn per active player per round and rotates turnOrder on next round', () => {
    let room = makeRoom({
      status: 'playing',
      round: 1,
      turnOrder: ['u_0', 'u_1', 'u_2', 'u_3'],
      turnIndex: 0,
      turnTimeLeft: 12,
      blackoutActive: true
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
    // Last speaker (u_3) should not start Round 2 immediately
    assert.notEqual(room.turnOrder![0], 'u_3');
  });

  it('rejects stale turn advancement when expectedTurnIndex mismatches', () => {
    const room = makeRoom({
      status: 'playing',
      round: 1,
      turnOrder: ['u_0', 'u_1', 'u_2'],
      turnIndex: 1
    });
    const stale = computeNextTurnState(room, { expectedTurnIndex: 0, wasTimeout: false });
    assert.equal(stale.changed, false);
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

describe('Blackout protocol trigger & voting resolution', () => {
  it('triggers blackout once per round cleanly without firing twice in the same round', () => {
    const room = makeRoom({
      status: 'playing',
      gameMode: 'blackout',
      turnSeconds: 20,
      round: 1,
      blackoutActive: false,
      lastBlackoutRound: 0
    });

    assert.equal(shouldTriggerBlackout(room, 18), false);
    assert.equal(shouldTriggerBlackout(room, 10), true);

    const alreadyTriggeredRoom = { ...room, lastBlackoutRound: 1 };
    assert.equal(shouldTriggerBlackout(alreadyTriggeredRoom, 10), false);
    assert.equal(BLACKOUT_DURATION_MS, 3500);
  });

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

  it('handles SKIP majority, ties, ejection cinematic pause, and standard vs mole parity win rules', () => {
    // 1. SKIP wins
    const skipRoom = makeRoom({
      status: 'voting',
      round: 1,
      spies: ['u_3'],
      players: makePlayers(4),
      votes: { u_0: 'SKIP', u_1: 'SKIP', u_2: 'u_3', u_3: 'u_0' }
    });
    const skipRes = resolveVoteOutcome(skipRoom, 10000);
    assert.equal(skipRes.outcome, 'nobody_ejected');
    assert.equal(skipRes.nextRoomFields.round, 2);
    assert.equal(skipRes.nextRoomFields.status, 'playing');

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

    // 4. Standard vs Mole parity (1 spy vs 1 innocent remaining after ejecting an innocent from 3-player game)
    const threePlayers = makePlayers(3);
    const stdParityRoom = makeRoom({
      gameMode: 'normal',
      status: 'voting',
      round: 1,
      spies: ['u_2'],
      players: threePlayers,
      votes: { u_0: 'u_1', u_1: 'u_2', u_2: 'u_1' }
    });
    const stdContinue = resolveVoteOutcome(stdParityRoom, 10000);
    assert.equal(stdContinue.outcome, 'innocent_ejected_continue');
    assert.equal(stdContinue.nextRoomFields.ejectionEndsAt, 10000 + EJECTION_CINEMATIC_MS + 300);

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
    assert.equal(DEFAULT_VOTE_SECONDS, 80);
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

describe('AI Bot clues, Chameleon decoy clues, Silent doodles, and voting', () => {
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

  it('generates valid normalized canvas strokes in Silent mode', () => {
    const crewStrokes = generateBotSilentDrawing('places', false);
    const spyStrokes = generateBotSilentDrawing('places', true);
    [crewStrokes, spyStrokes].forEach(strokes => {
      assert.ok(strokes.length > 0);
      strokes.forEach(stroke => {
        assert.ok(stroke.length >= 2);
        stroke.forEach(pt => {
          assert.ok(pt.x >= 0 && pt.x <= 1);
          assert.ok(pt.y >= 0 && pt.y <= 1);
        });
      });
    });
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
});
