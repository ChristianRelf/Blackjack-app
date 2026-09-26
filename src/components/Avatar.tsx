import { rankMeta } from '../lib/game';

const palette = ['#f08b56', '#64b6ac', '#8179ee', '#d65780', '#e8b755', '#73a4e6'];

export function Avatar({ name, avatar, size = 'md', online = false }: { name: string; avatar: string | null; size?: 'xs' | 'sm' | 'md' | 'lg'; online?: boolean }) {
  const color = palette[name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
  return (
    <span className={`avatar avatar-${size}`} style={{ '--avatar-color': color } as React.CSSProperties}>
      {avatar ? <img src={avatar} alt="" /> : <span>{name.slice(0, 2).toUpperCase()}</span>}
      {online && <i className="online-dot" />}
    </span>
  );
}

export function RankCrest({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const rank = rankMeta(xp);
  return (
    <span className={`rank-crest ${compact ? 'compact' : ''}`} title={`${rank.tier} · ${rank.title}`}>
      <img src={rank.icon} alt="" />
      {!compact && <span><b>{rank.title}</b><small>{rank.tier} · LVL {rank.level}</small></span>}
    </span>
  );
}
