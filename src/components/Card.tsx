import type { CardData } from '../types';
import { cardAsset } from '../lib/game';

export function PlayingCard({ card, index = 0, small = false }: { card: CardData; index?: number; small?: boolean }) {
  return (
    <div
      className={`playing-card ${card.hidden ? 'is-hidden' : ''} ${small ? 'is-small' : ''}`}
      style={{ '--card-index': index } as React.CSSProperties}
      aria-label={card.hidden ? 'Face-down card' : `${card.rank} of ${card.suit}`}
    >
      <div className="card-flipper">
        <img src={cardAsset(card)} alt="" draggable={false} />
      </div>
    </div>
  );
}

export function CardFan({ cards, small = false }: { cards: CardData[]; small?: boolean }) {
  return (
    <div className={`card-fan ${small ? 'small' : ''}`}>
      {cards.map((card, index) => <PlayingCard key={card.id} card={card} index={index} small={small} />)}
    </div>
  );
}
