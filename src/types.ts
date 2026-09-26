export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | 'J' | 'Q' | 'K';

export interface CardData {
  id: string;
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

export type PlayerStatus = 'waiting' | 'playing' | 'stood' | 'bust' | 'blackjack' | 'won' | 'lost' | 'push';

export interface PlayerData {
  id: string;
  name: string;
  avatar: string | null;
  chips: number;
  bet: number;
  hand: CardData[];
  status: PlayerStatus;
  seat: number;
  xp: number;
  connected: boolean;
  isBot?: boolean;
}

export interface ChatMessage {
  id: string;
  author: string;
  avatar: string | null;
  message: string;
  time: string;
  system?: boolean;
}

export interface RoomState {
  id: string;
  name: string;
  phase: 'betting' | 'playing' | 'dealer' | 'settled';
  round: number;
  players: PlayerData[];
  dealer: {
    hand: CardData[];
    score: number;
    confidence: number;
    thought: string;
  };
  secondsLeft: number;
  minBet: number;
  maxBet: number;
  shoeRemaining: number;
  chat: ChatMessage[];
}

export interface UserData {
  id: string;
  name: string;
  avatar: string | null;
  chips: number;
  xp: number;
  authenticated: boolean;
}
