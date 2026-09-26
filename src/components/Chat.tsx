import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage, PlayerData } from '../types';
import { Avatar, RankCrest } from './Avatar';
import { money } from '../lib/game';
import { AssetIcon } from './AssetIcon';

export function SocialPanel({ messages, players, onSend }: { messages: ChatMessage[]; players: PlayerData[]; onSend: (message: string) => void }) {
  const [tab, setTab] = useState<'table' | 'players'>('table');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, tab]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <aside className="social-panel panel">
      <div className="social-tabs">
        <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>Table chat</button>
        <button className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}><AssetIcon name="pawns" size={15} /> {players.length}</button>
      </div>
      {tab === 'table' ? (
        <>
          <div className="message-list">
            {messages.map((message) => message.system ? (
              <div className="system-message" key={message.id}><span />{message.message}</div>
            ) : (
              <div className="chat-message" key={message.id}>
                <Avatar name={message.author} avatar={message.avatar} size="sm" />
                <div><div className="message-meta"><b>{message.author}</b><time>{new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.message}</p></div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="chat-form" onSubmit={submit}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Say something…" maxLength={180} aria-label="Chat message" />
            <button aria-label="Send message"><Send size={16} /></button>
          </form>
        </>
      ) : (
        <div className="player-list">
          {[...players].sort((a, b) => b.chips - a.chips).map((player, index) => (
            <div className="player-row" key={player.id}>
              <span className="leader-number">{String(index + 1).padStart(2, '0')}</span>
              <Avatar name={player.name} avatar={player.avatar} size="sm" online={player.connected} />
              <span className="player-row-name"><b>{player.name}</b><small>{player.isBot ? 'house regular' : 'discord player'}</small></span>
              <RankCrest xp={player.xp} compact />
              <strong>◈ {money(player.chips)}</strong>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
