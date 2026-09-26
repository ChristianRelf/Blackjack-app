import type { CardData } from '../src/types.js';

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const cardNumber = (card: CardData) => {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return Number(card.rank);
};

export function scoreHand(cards: CardData[]) {
  let total = cards.reduce((sum, card) => sum + cardNumber(card), 0);
  let aces = cards.filter((card) => card.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

/**
 * A tiny frozen multilayer perceptron used for table telemetry. The output is a
 * learned risk estimate; the final action remains constrained by the posted
 * S17 house rule so the dealer cannot change the odds behind the players' backs.
 */
export function dealerPolicy(hand: CardData[], seenCards: CardData[], shoeSize: number) {
  const { total, soft } = scoreHand(hand);
  const highCards = seenCards.filter((card) => cardNumber(card) >= 10 || card.rank === 'A').length;
  const lowCards = seenCards.filter((card) => cardNumber(card) <= 6).length;
  const runningCount = lowCards - highCards;
  const decksLeft = Math.max(0.5, shoeSize / 52);
  const trueCount = runningCount / decksLeft;
  const inputs = [total / 21, soft ? 1 : 0, Math.tanh(trueCount / 5), Math.min(1, hand.length / 6)];

  const hiddenWeights = [
    [2.8, -0.9, 0.42, -0.35, -1.15],
    [-3.1, 1.6, -0.55, 0.25, 1.28],
    [1.05, 0.4, 1.7, -0.2, -0.44],
    [-0.72, 1.1, -0.3, 1.45, -0.35],
    [2.2, -1.2, 0.2, 0.8, -0.98],
  ];
  const hidden = hiddenWeights.map(([a, b, c, d, bias]) => Math.tanh(a * inputs[0] + b * inputs[1] + c * inputs[2] + d * inputs[3] + bias));
  const raw = hidden.reduce((sum, value, index) => sum + value * [1.1, -0.85, 0.48, -0.42, 0.76][index], -0.15);
  const risk = sigmoid(raw);

  const action: 'hit' | 'stand' = total < 17 ? 'hit' : 'stand';
  const confidence = Math.round((action === 'hit' ? Math.max(risk, 0.66) : Math.max(1 - risk, 0.72)) * 100);
  const thought = total < 17
    ? `${soft ? 'Soft total' : 'Hard total'} below the S17 line · model pressure ${Math.round(risk * 100)}%`
    : `${soft ? 'Soft' : 'Hard'} ${total} locks the house line · shoe count ${trueCount >= 0 ? '+' : ''}${trueCount.toFixed(1)}`;

  return { action, confidence: Math.min(99, confidence), thought };
}
