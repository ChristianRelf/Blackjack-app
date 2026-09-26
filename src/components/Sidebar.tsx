import { ChevronRight, Sparkles } from 'lucide-react';
import type { PlayerData, UserData } from '../types';
import { money, rankMeta } from '../lib/game';
import { Avatar, RankCrest } from './Avatar';
import { AssetIcon } from './AssetIcon';

export function ProfileSidebar({ user, player, onRules }: { user: UserData; player?: PlayerData; onRules: () => void }) {
  const rank = rankMeta(player?.xp ?? user.xp);
  const chips = player?.chips ?? user.chips;
  return (
    <aside className="profile-sidebar">
      <section className="profile-card panel">
        <div className="profile-top">
          <Avatar name={user.name} avatar={user.avatar} size="lg" online />
          <div><span className="eyebrow">YOUR SEAT</span><h2>{user.name}</h2><span className="status-line"><i /> Ready at table</span></div>
        </div>
        <RankCrest xp={player?.xp ?? user.xp} />
        <div className="rank-progress"><span style={{ width: `${rank.progress}%` }} /></div>
        <div className="xp-line"><span>{rank.progress} XP</span><span>{100 - rank.progress} to level {rank.level + 1}</span></div>
      </section>

      <section className="wallet-card panel">
        <div className="section-label"><span>CHIP BALANCE</span><AssetIcon name="tokens_stack" size={16} /></div>
        <div className="balance"><i className="tiny-chip" /> <strong>{money(chips)}</strong></div>
        <small>Play-money only · no cash value</small>
      </section>

      <section className="mission-card panel">
        <div className="section-label"><span>TONIGHT'S RUN</span><AssetIcon name="crown_a" size={16} /></div>
        <div className="stat-pair"><span><b>3</b><small>hand streak</small></span><span><b>62%</b><small>win rate</small></span></div>
        <div className="mission"><span className="mission-icon"><AssetIcon name="award" size={16} /></span><span><b>Double trouble</b><small>Win one doubled hand</small></span><strong>+75</strong></div>
        <div className="mission-progress"><span /></div>
      </section>

      <button className="rules-link panel" onClick={onRules}><span><AssetIcon name="book_open" size={17} /> House rules</span><ChevronRight size={16} /></button>
      <div className="fair-badge"><Sparkles size={13} /><span>Provably shuffled in-session</span></div>
    </aside>
  );
}
