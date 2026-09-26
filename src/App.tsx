import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, CircleHelp, Info, LogIn, Menu, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import type { PlayerData, RoomState, UserData } from './types';
import { handValue, money, rankMeta } from './lib/game';
import { playSound, soundEnabled, toggleSound } from './lib/sound';
import { Avatar, RankCrest } from './components/Avatar';
import { CardFan } from './components/Card';
import { SocialPanel } from './components/Chat';
import { ProfileSidebar } from './components/Sidebar';
import { AssetIcon } from './components/AssetIcon';

const chipValues = [10, 25, 100, 500];
const chipClass: Record<number, string> = { 10: 'ivory', 25: 'coral', 100: 'teal', 500: 'black' };

function MachineDealer({ room }: { room: RoomState }) {
  const live = room.phase === 'dealer';
  return (
    <div className={`machine-dealer ${live ? 'thinking' : ''}`}>
      <div className="dealer-halo"><span className="scanner" /><Bot size={25} /></div>
      <div className="machine-copy">
        <div><span className="eyebrow">MACHINE DEALER / ML-17</span><span className="live-pill"><i /> {live ? 'THINKING' : 'ONLINE'}</span></div>
        <h3>Dealer Zero</h3>
        <p>{room.dealer.thought}</p>
      </div>
      <div className="confidence">
        <span><AssetIcon name="spinner_segment" size={14} /> POLICY CONFIDENCE</span>
        <b>{room.dealer.confidence}%</b>
        <div><i style={{ width: `${room.dealer.confidence}%` }} /></div>
      </div>
    </div>
  );
}

function OpponentSeat({ player }: { player: PlayerData }) {
  const value = handValue(player.hand).total;
  return (
    <div className={`opponent-seat status-${player.status}`}>
      <CardFan cards={player.hand} small />
      <div className="opponent-tag">
        <RankCrest xp={player.xp} compact />
        <Avatar name={player.name} avatar={player.avatar} size="sm" online={player.connected} />
        <span><b>{player.name}</b><small>{player.bet ? `◈ ${money(player.bet)}` : 'Watching'}</small></span>
        {player.hand.length > 0 && <em>{value}</em>}
      </div>
      {['won', 'lost', 'push', 'bust'].includes(player.status) && <strong className="seat-result">{player.status}</strong>}
    </div>
  );
}

function BlackjackTable({ room, user, socket }: { room: RoomState; user: UserData; socket: Socket }) {
  const me = room.players.find((player) => player.id === user.id);
  const others = room.players.filter((player) => player.id !== user.id).slice(0, 4);
  const score = handValue(me?.hand ?? []).total;
  const canAct = room.phase === 'playing' && me?.status === 'playing';
  const canDeal = room.phase === 'betting' && (me?.bet ?? 0) >= room.minBet;

  const bet = (amount: number) => {
    playSound('chip');
    socket.emit('place_bet', amount);
  };
  const action = (kind: 'hit' | 'stand' | 'double') => {
    playSound(kind === 'hit' ? 'card' : 'tap');
    socket.emit('action', kind);
  };
  const deal = () => {
    playSound('shuffle', 0.3);
    socket.emit(room.phase === 'settled' ? 'new_round' : 'deal');
  };

  return (
    <main className="table-column">
      <div className="table-meta">
        <span><i className="live-dot" /> LIVE TABLE</span><b>{room.name}</b><span>ROUND {String(room.round).padStart(3, '0')}</span>
      </div>
      <div className="table-wrap">
        <div className="felt-grain" />
        <div className="suit-rail" aria-hidden="true">
          <AssetIcon name="suit_spades" size={13} /><AssetIcon name="suit_hearts" size={13} /><AssetIcon name="suit_diamonds" size={13} /><AssetIcon name="suit_clubs" size={13} />
        </div>
        <div className="house-tags">
          <span><AssetIcon name="tag_shield_6" size={15} /> 6 DECK</span>
          <span><AssetIcon name="cards_collection" size={15} /> 3:2</span>
          <span><AssetIcon name="hand_card" size={15} /> S17</span>
        </div>
        <div className="opponent-row">
          {others.map((player) => <OpponentSeat key={player.id} player={player} />)}
        </div>
        <div className="dealer-zone">
          <div className="dealer-score"><span>DEALER</span>{room.dealer.hand.length > 0 && <b>{room.dealer.score || '?'}</b>}</div>
          <CardFan cards={room.dealer.hand} />
          {room.dealer.hand.length === 0 && <div className="deck-idle"><span /><span /><span /></div>}
        </div>
        <div className="table-mark">
          <span>AFTERDARK</span>
          <b>BLACKJACK PAYS 3 TO 2</b>
          <small>DEALER STANDS ON SOFT 17</small>
        </div>
        <div className="player-zone">
          <div className={`hand-score ${score > 21 ? 'bust' : ''}`}>
            {me?.hand.length ? <><span>YOUR HAND</span><b>{score}</b>{handValue(me.hand).soft && <small>SOFT</small>}</> : <span>PLACE YOUR BET</span>}
          </div>
          <CardFan cards={me?.hand ?? []} />
          {room.phase === 'settled' && me?.status && (
            <div className={`round-result result-${me.status}`}>
              <span>{me.status === 'won' ? 'YOU WIN' : me.status === 'push' ? 'PUSH' : 'HOUSE WINS'}</span>
              <b>{me.status === 'won' ? `+ ◈ ${money(me.bet)}` : me.status === 'push' ? 'BET RETURNED' : `− ◈ ${money(me.bet)}`}</b>
            </div>
          )}
        </div>
        <div className="bet-spot"><span>{me?.bet ? `◈ ${money(me.bet)}` : 'BET'}</span></div>
      </div>

      <div className="control-deck panel">
        <div className="bet-controls">
          <div className="control-label"><span>BET</span><small>MIN {room.minBet} / MAX {money(room.maxBet)}</small></div>
          <div className="chip-row">
            {chipValues.map((value) => (
              <button key={value} className={`poker-chip ${chipClass[value]}`} disabled={room.phase !== 'betting' || (me?.chips ?? 0) < value} onClick={() => bet(value)}><span>{value}</span></button>
            ))}
          </div>
          <button className="clear-bet" disabled={!me?.bet || room.phase !== 'betting'} onClick={() => socket.emit('clear_bet')}><AssetIcon name="token_remove" size={14} /> CLEAR</button>
        </div>
        <div className="action-controls">
          {room.phase === 'betting' || room.phase === 'settled' ? (
            <button className="deal-button" disabled={room.phase === 'betting' && !canDeal} onClick={deal}>
              <span><AssetIcon name={room.phase === 'settled' ? 'card_flip' : 'cards_shuffle'} size={18} /> {room.phase === 'settled' ? 'NEXT HAND' : 'DEAL CARDS'}</span>
              <small>{room.phase === 'settled' ? 'RETURN TO BETTING' : canDeal ? `LOCK ◈ ${money(me?.bet ?? 0)}` : `MINIMUM BET ◈ ${room.minBet}`}</small>
            </button>
          ) : (
            <>
              <button className="game-action secondary" disabled={!canAct} onClick={() => action('stand')}><AssetIcon name="hand_card" size={17} /><span>STAND</span><kbd>S</kbd></button>
              <button className="game-action primary" disabled={!canAct} onClick={() => action('hit')}><AssetIcon name="card_tap" size={17} /><span>HIT</span><kbd>H</kbd></button>
              <button className="game-action secondary" disabled={!canAct || (me?.hand.length ?? 0) !== 2 || (me?.chips ?? 0) < (me?.bet ?? 0)} onClick={() => action('double')}><AssetIcon name="card_flipdouble" size={17} /><span>DOUBLE</span><kbd>D</kbd></button>
            </>
          )}
        </div>
      </div>
      <MachineDealer room={room} />
    </main>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rules-modal panel" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <button className="modal-close" onClick={onClose} aria-label="Close rules"><X size={18} /></button>
        <span className="eyebrow">TABLE 01</span><h2 id="rules-title">House rules, minus the fine print.</h2>
        <div className="rule-grid">
          <div><AssetIcon name="cards_collection" size={21} /><b>3:2</b><span>Natural blackjack payout</span></div><div><AssetIcon name="hand_card" size={21} /><b>S17</b><span>Dealer stands on soft 17</span></div><div><AssetIcon name="tag_shield_6" size={21} /><b>6×</b><span>Six shuffled decks</span></div><div><AssetIcon name="card_flipdouble" size={21} /><b>2×</b><span>Double on any first two</span></div>
        </div>
        <p>Get closer to 21 than the dealer without going over. Face cards are worth 10; aces are 1 or 11. This is a social play-money table—chips have no cash value.</p>
        <div className="model-note"><Bot size={20} /><span><b>About Dealer Zero</b>The dealer runs a compact neural policy for shoe-pressure telemetry, then follows the posted S17 rule. It cannot see hidden player cards or alter the shuffle.</span></div>
        <button className="understood" onClick={onClose}>GOT IT — TAKE ME BACK</button>
      </section>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [muted, setMuted] = useState(!soundEnabled());
  const [rulesOpen, setRulesOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const previousCards = useRef(0);

  useEffect(() => {
    let connection: Socket | null = null;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth === 'setup') setNotice('Discord OAuth needs credentials in your .env file. Guest play is ready now.');
    if (auth === 'error') setNotice('Discord sign-in did not finish. You can retry or keep playing as a guest.');
    if (auth === 'success') setNotice('Discord connected — welcome to the table.');
    if (auth) window.history.replaceState({}, '', '/');

    fetch('/api/me', { credentials: 'include' }).then((response) => response.json()).then((data: UserData) => {
      setUser(data);
      connection = io(import.meta.env.DEV ? 'http://localhost:3001' : undefined, { withCredentials: true });
      connection.on('room_state', (nextRoom: RoomState) => setRoom(nextRoom));
      setSocket(connection);
    }).catch(() => setNotice('The table server is offline. Run npm run dev to open the room.'));
    return () => { connection?.disconnect(); };
  }, []);

  const totalCards = useMemo(() => room ? room.dealer.hand.length + room.players.reduce((sum, player) => sum + player.hand.length, 0) : 0, [room]);
  useEffect(() => {
    if (totalCards > previousCards.current && previousCards.current > 0) playSound('card', 0.32);
    previousCards.current = totalCards;
  }, [totalCards]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!socket || !room || (event.target as HTMLElement).tagName === 'INPUT') return;
      if (event.key.toLowerCase() === 'h') socket.emit('action', 'hit');
      if (event.key.toLowerCase() === 's') socket.emit('action', 'stand');
      if (event.key.toLowerCase() === 'd') socket.emit('action', 'double');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [socket, room]);

  if (!user || !room || !socket) {
    return <div className="loading-screen"><div className="loading-mark"><span>21</span></div><p>OPENING THE TABLE</p><i /></div>;
  }

  const me = room.players.find((player) => player.id === user.id);
  const rank = rankMeta(me?.xp ?? user.xp);
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><i>21</i></span><span><b>AFTERDARK</b><small>COMMUNITY BLACKJACK</small></span></div>
        <div className="table-switcher"><span className="live-dot" /><span><small>PLAYING AT</small><b>Table 01 · Night Shift</b></span><ChevronDown size={15} /></div>
        <nav>
          <button title="How to play" onClick={() => setRulesOpen(true)}><CircleHelp size={19} /></button>
          <button title={muted ? 'Turn sound on' : 'Mute table'} onClick={() => { setMuted(!toggleSound()); }}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
          <button title="Settings"><Settings2 size={19} /></button>
          {!user.authenticated && <a className="discord-login" href="/api/auth/discord"><LogIn size={16} /> CONNECT DISCORD</a>}
          <div className="nav-profile"><RankCrest xp={me?.xp ?? user.xp} compact /><Avatar name={user.name} avatar={user.avatar} size="sm" online /><span><b>{user.name}</b><small>{rank.title}</small></span><ChevronDown size={14} /></div>
          <button className="mobile-menu"><Menu size={20} /></button>
        </nav>
      </header>
      {notice && <div className="notice"><Info size={15} /><span>{notice}</span><button onClick={() => setNotice(null)}><X size={14} /></button></div>}
      <div className="game-layout">
        <ProfileSidebar user={user} player={me} onRules={() => setRulesOpen(true)} />
        <BlackjackTable room={room} user={user} socket={socket} />
        <SocialPanel messages={room.chat} players={room.players} onSend={(message) => socket.emit('chat', message)} />
      </div>
      <footer><span><AssetIcon name="shield" size={13} /> FAIR PLAY SESSION</span><span><AssetIcon name="cards_collection" size={13} /> SHOE {room.shoeRemaining}/312</span><span><AssetIcon name="spinner_segment" size={13} /> ML POLICY v1.7</span><span><AssetIcon name="tag_infinite" size={13} /> PLAY-MONEY EXPERIENCE</span></footer>
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
