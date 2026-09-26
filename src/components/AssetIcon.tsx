export type GameIconName =
  | 'award' | 'book_open' | 'card_flip' | 'card_flipdouble' | 'card_tap' | 'cards_collection'
  | 'cards_shuffle' | 'crown_a' | 'hand_card' | 'hourglass' | 'shield' | 'spinner_segment'
  | 'suit_clubs' | 'suit_diamonds' | 'suit_hearts' | 'suit_spades' | 'tag_infinite'
  | 'tag_shield_6' | 'token_add' | 'token_remove' | 'tokens' | 'tokens_stack' | 'pawns';

export function AssetIcon({ name, size = 18, className = '' }: { name: GameIconName; size?: number; className?: string }) {
  return (
    <span
      className={`asset-icon ${className}`}
      style={{ '--asset-url': `url("/Assets/Game-Icons/PNG/Default%20(64px)/${name}.png")`, '--asset-size': `${size}px` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
