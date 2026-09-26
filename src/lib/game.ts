import type { CardData } from '../types';

export function handValue(cards: CardData[]) {
  let total = cards.reduce((sum, card) => {
    if (card.hidden) return sum;
    if (card.rank === 'A') return sum + 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return sum + 10;
    return sum + Number(card.rank);
  }, 0);
  let aces = cards.filter((card) => card.rank === 'A' && !card.hidden).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

export function rankMeta(xp: number) {
  const level = Math.max(1, Math.floor(xp / 100) + 1);
  const tier = xp >= 2400 ? 'Black' : xp >= 1200 ? 'Gold' : xp >= 500 ? 'Silver' : 'Bronze';
  const names = tier === 'Black'
    ? ['Obsidian', 'Pit Boss', 'House Legend']
    : tier === 'Gold'
      ? ['High Roller', 'Golden Hand', 'Card Shark']
      : tier === 'Silver'
        ? ['Counter', 'Sharp Eye', 'Table Regular']
        : ['New Blood', 'Deckhand', 'Lucky Break'];
  const title = names[Math.min(names.length - 1, Math.floor((xp % 600) / 200))];
  const assetIndex = Math.min(77, Math.floor((xp % 7800) / 100)).toString().padStart(3, '0');
  return {
    level,
    tier,
    title,
    progress: xp % 100,
    icon: `/Assets/Ranks/${tier}/rank${assetIndex}.png`,
  };
}

export function cardAsset(card: CardData) {
  if (card.hidden) return '/Assets/PlayingCards/PNG/Cards%20(large)/card_back.png';
  return `/Assets/PlayingCards/PNG/Cards%20(large)/card_${card.suit}_${card.rank}.png`;
}

export const money = (value: number) => new Intl.NumberFormat('en-US').format(value);
