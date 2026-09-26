import { randomUUID } from 'node:crypto';
import { dealerPolicy, scoreHand } from './dealerModel.js';
import type { CardData, ChatMessage, PlayerData, Rank, RoomState, Suit } from '../src/types.js';

type InternalRoom = RoomState & { deck: CardData[]; seen: CardData[] };

const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const ranks: Rank[] = ['A', '02', '03', '04', '05', '06', '07', '08', '09', '10', 'J', 'Q', 'K'];

function makeShoe() {
  const deck: CardData[] = [];
  for (let pack = 0; pack < 6; pack += 1) {
    for (const suit of suits) {
      for (const rank of ranks) deck.push({ id: `${pack}-${suit}-${rank}-${randomUUID().slice(0, 5)}`, suit, rank });
    }
  }
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[target]] = [deck[target], deck[index]];
  }
  return deck;
}

const botSeeds = [
  { id: 'bot-mika', name: 'Mika', seat: 0, chips: 4280, xp: 780, avatar: null },
  { id: 'bot-jo', name: 'Jo', seat: 1, chips: 1950, xp: 340, avatar: null },
  { id: 'bot-nova', name: 'Nova', seat: 3, chips: 6700, xp: 1360, avatar: null },
];

const systemMessage = (message: string): ChatMessage => ({
  id: randomUUID(), author: 'TABLE', avatar: null, message, time: new Date().toISOString(), system: true,
});

export function createRoom(): InternalRoom {
  const deck = makeShoe();
  return {
    id: 'afterdark-01',
    name: 'AFTERDARK / TABLE 01',
    phase: 'betting',
    round: 48,
    minBet: 10,
    maxBet: 1000,
    secondsLeft: 24,
    shoeRemaining: deck.length,
    deck,
    seen: [],
    dealer: { hand: [], score: 0, confidence: 94, thought: 'Waiting for wagers · S17 policy ready' },
    players: botSeeds.map((bot) => ({ ...bot, bet: 0, hand: [], status: 'waiting', connected: true, isBot: true })),
    chat: [
      systemMessage('Table 01 opened · six-deck shoe · dealer stands on soft 17'),
      { id: randomUUID(), author: 'Mika', avatar: null, message: 'that last double was criminal 😭', time: new Date(Date.now() - 65_000).toISOString() },
      { id: randomUUID(), author: 'Nova', avatar: null, message: 'one more hand then I am definitely leaving', time: new Date(Date.now() - 31_000).toISOString() },
    ],
  };
}

function draw(room: InternalRoom) {
  if (room.deck.length < 52) room.deck = makeShoe();
  const card = room.deck.pop()!;
  room.seen.push(card);
  room.shoeRemaining = room.deck.length;
  return card;
}

export function publicRoom(room: InternalRoom): RoomState {
  const hiddenDealer = room.phase === 'playing';
  const dealerHand = room.dealer.hand.map((card, index) => index === 1 && hiddenDealer ? { ...card, hidden: true } : { ...card, hidden: false });
  const visibleScore = hiddenDealer && dealerHand.length ? scoreHand([dealerHand[0]]).total : scoreHand(dealerHand).total;
  return {
    ...room,
    dealer: { ...room.dealer, hand: dealerHand, score: visibleScore },
    players: room.players.map((player) => ({ ...player, hand: [...player.hand] })),
    deck: undefined,
    seen: undefined,
  } as unknown as RoomState;
}

export function upsertPlayer(room: InternalRoom, profile: { id: string; name: string; avatar: string | null; chips: number; xp: number }) {
  const existing = room.players.find((player) => player.id === profile.id);
  if (existing) {
    Object.assign(existing, profile, { connected: true });
    return existing;
  }
  const taken = new Set(room.players.map((player) => player.seat));
  const seat = [2, 4, 5].find((value) => !taken.has(value)) ?? room.players.length;
  const player: PlayerData = { ...profile, bet: 0, hand: [], status: 'waiting', seat, connected: true };
  room.players.push(player);
  room.chat.push(systemMessage(`${profile.name} took seat ${seat + 1}`));
  return player;
}

export function disconnectPlayer(room: InternalRoom, id: string) {
  const index = room.players.findIndex((item) => item.id === id);
  const player = room.players[index];
  if (!player || player.isBot) return undefined;
  if (room.phase === 'betting') {
    player.chips += player.bet;
    player.bet = 0;
    room.players.splice(index, 1);
    return player;
  }
  if (room.phase === 'settled') {
    room.players.splice(index, 1);
    return player;
  }
  player.connected = false;
  if (player.status === 'playing') player.status = 'stood';
  return undefined;
}

export function placeBet(room: InternalRoom, id: string, amount: number) {
  const player = room.players.find((item) => item.id === id);
  if (!player || room.phase !== 'betting' || ![10, 25, 100, 500].includes(amount)) return false;
  if (player.chips < amount || player.bet + amount > room.maxBet) return false;
  player.chips -= amount;
  player.bet += amount;
  return true;
}

export function clearBet(room: InternalRoom, id: string) {
  const player = room.players.find((item) => item.id === id);
  if (!player || room.phase !== 'betting') return false;
  player.chips += player.bet;
  player.bet = 0;
  return true;
}

export function beginRound(room: InternalRoom) {
  if (room.phase !== 'betting') return false;
  for (const bot of room.players.filter((player) => player.isBot)) {
    const betOptions = [25, 50, 100, 150];
    const amount = Math.min(bot.chips, betOptions[Math.floor(Math.random() * betOptions.length)]);
    bot.chips -= amount;
    bot.bet = amount;
  }
  const active = room.players.filter((player) => player.bet >= room.minBet);
  if (!active.length) return false;
  room.phase = 'playing';
  room.round += 1;
  room.dealer.hand = [draw(room), draw(room)];
  room.dealer.thought = 'Reading the shoe · S17 policy active';
  for (const player of active) {
    player.hand = [draw(room), draw(room)];
    const score = scoreHand(player.hand).total;
    player.status = score === 21 ? 'blackjack' : 'playing';
  }
  for (const player of room.players.filter((item) => item.bet === 0)) {
    player.hand = [];
    player.status = 'waiting';
  }
  return true;
}

export function playerAction(room: InternalRoom, id: string, action: 'hit' | 'stand' | 'double') {
  const player = room.players.find((item) => item.id === id);
  if (!player || room.phase !== 'playing' || player.status !== 'playing') return false;
  if (action === 'double') {
    if (player.hand.length !== 2 || player.chips < player.bet) return false;
    player.chips -= player.bet;
    player.bet *= 2;
    player.hand.push(draw(room));
    const value = scoreHand(player.hand).total;
    player.status = value > 21 ? 'bust' : 'stood';
    return true;
  }
  if (action === 'stand') {
    player.status = 'stood';
    return true;
  }
  player.hand.push(draw(room));
  const value = scoreHand(player.hand).total;
  if (value > 21) player.status = 'bust';
  else if (value === 21) player.status = 'stood';
  return true;
}

export function playBots(room: InternalRoom) {
  for (const bot of room.players.filter((player) => player.isBot && player.status === 'playing')) {
    let safety = 0;
    while (bot.status === 'playing' && safety < 8) {
      const value = scoreHand(bot.hand).total;
      if (value < 16 || (value === 16 && Math.random() > 0.55)) playerAction(room, bot.id, 'hit');
      else playerAction(room, bot.id, 'stand');
      safety += 1;
    }
  }
}

export function shouldPlayDealer(room: InternalRoom) {
  const active = room.players.filter((player) => player.bet > 0);
  return room.phase === 'playing' && active.length > 0 && active.every((player) => player.status !== 'playing');
}

export function dealerStep(room: InternalRoom) {
  room.phase = 'dealer';
  const policy = dealerPolicy(room.dealer.hand, room.seen, room.deck.length);
  room.dealer.confidence = policy.confidence;
  room.dealer.thought = policy.thought;
  if (policy.action === 'hit') {
    room.dealer.hand.push(draw(room));
    return true;
  }
  return false;
}

export function settleRound(room: InternalRoom) {
  const dealerScore = scoreHand(room.dealer.hand).total;
  const dealerBust = dealerScore > 21;
  for (const player of room.players.filter((item) => item.bet > 0)) {
    const score = scoreHand(player.hand).total;
    if (player.status === 'bust') {
      player.status = 'lost';
    } else if (player.status === 'blackjack' && dealerScore !== 21) {
      player.chips += Math.floor(player.bet * 2.5);
      player.xp += 36;
      player.status = 'won';
    } else if (dealerBust || score > dealerScore) {
      player.chips += player.bet * 2;
      player.xp += 24;
      player.status = 'won';
    } else if (score === dealerScore) {
      player.chips += player.bet;
      player.xp += 8;
      player.status = 'push';
    } else {
      player.xp += 3;
      player.status = 'lost';
    }
  }
  room.phase = 'settled';
  room.dealer.score = dealerScore;
  room.chat.push(systemMessage(`Round ${room.round} settled · dealer ${dealerBust ? 'busts' : `shows ${dealerScore}`}`));
}

export function resetRound(room: InternalRoom) {
  if (room.phase !== 'settled') return false;
  room.phase = 'betting';
  room.secondsLeft = 24;
  room.dealer = { hand: [], score: 0, confidence: 94, thought: 'Waiting for wagers · S17 policy ready' };
  room.players = room.players.filter((player) => player.isBot || player.connected);
  for (const player of room.players) {
    player.hand = [];
    player.bet = 0;
    player.status = 'waiting';
  }
  return true;
}

export function addChat(room: InternalRoom, author: Pick<PlayerData, 'name' | 'avatar'>, raw: string) {
  const message = raw.trim().slice(0, 180);
  if (!message) return false;
  room.chat.push({ id: randomUUID(), author: author.name, avatar: author.avatar, message, time: new Date().toISOString() });
  room.chat = room.chat.slice(-40);
  return true;
}
