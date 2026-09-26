import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import sessionFileStore from 'session-file-store';
import { Server } from 'socket.io';
import { addChat, beginRound, clearBet, createRoom, dealerStep, disconnectPlayer, placeBet, playBots, playerAction, publicRoom, resetRound, settleRound, shouldPlayDealer, upsertPlayer } from './game.js';
import { getProfile, saveProfile, type StoredProfile } from './store.js';

declare module 'express-session' {
  interface SessionData {
    profile?: StoredProfile;
    oauthState?: string;
    authenticated?: boolean;
  }
}

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT ?? 3001);
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const isProduction = existsSync(join(process.cwd(), 'dist', 'index.html')) && process.env.NODE_ENV === 'production';
const FileStore = sessionFileStore(session);
const secureCookies = process.env.COOKIE_SECURE === 'true';
if (secureCookies) app.set('trust proxy', 1);
const sessionMiddleware = session({
  store: new FileStore({ path: join(process.cwd(), 'server', 'data', 'sessions'), ttl: 60 * 60 * 24 * 30, retries: 0 }),
  secret: process.env.SESSION_SECRET ?? 'afterdark-local-development-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: secureCookies, maxAge: 1000 * 60 * 60 * 24 * 30 },
});

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use('/Assets', express.static(join(process.cwd(), 'Assets')));

function sessionProfile(req: express.Request) {
  if (!req.session.profile) {
    const suffix = Math.floor(1000 + Math.random() * 8999);
    req.session.profile = getProfile(`guest-${randomUUID()}`, { name: `NightOwl${suffix}`, avatar: null, chips: 2500, xp: 210 });
    req.session.authenticated = false;
  } else {
    const current = req.session.profile;
    req.session.profile = getProfile(current.id, {
      name: current.name,
      avatar: current.avatar,
      chips: current.chips,
      xp: current.xp,
    });
  }
  return req.session.profile;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, discordConfigured: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) }));
app.get('/api/me', (req, res) => res.json({ ...sessionProfile(req), authenticated: Boolean(req.session.authenticated) }));

app.get('/api/auth/discord', (req, res) => {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    res.redirect(`${clientOrigin}/?auth=setup`);
    return;
  }
  const state = randomUUID();
  req.session.oauthState = state;
  const redirect = process.env.DISCORD_REDIRECT_URI ?? `http://localhost:${port}/api/auth/discord/callback`;
  const query = new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, response_type: 'code', redirect_uri: redirect, scope: 'identify', state });
  res.redirect(`https://discord.com/oauth2/authorize?${query}`);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  if (!req.query.code || req.query.state !== req.session.oauthState) {
    res.redirect(`${clientOrigin}/?auth=error`);
    return;
  }
  try {
    const redirectUri = process.env.DISCORD_REDIRECT_URI ?? `http://localhost:${port}/api/auth/discord/callback`;
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID!, client_secret: process.env.DISCORD_CLIENT_SECRET!, grant_type: 'authorization_code', code: String(req.query.code), redirect_uri: redirectUri }),
    });
    const token = await tokenResponse.json() as { access_token?: string };
    const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token.access_token}` } });
    const user = await userResponse.json() as { id: string; username: string; global_name?: string; avatar?: string };
    if (!user.id) throw new Error('Discord profile unavailable');
    const avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null;
    req.session.profile = getProfile(`discord-${user.id}`, { name: user.global_name || user.username, avatar, chips: 2500, xp: 0 });
    req.session.authenticated = true;
    res.redirect(`${clientOrigin}/?auth=success`);
  } catch {
    res.redirect(`${clientOrigin}/?auth=error`);
  }
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.status(204).end()));

const io = new Server(server, { cors: { origin: clientOrigin, credentials: true } });
io.engine.use(sessionMiddleware);
const room = createRoom();

function broadcast() {
  io.to(room.id).emit('room_state', publicRoom(room));
}

function saveHumans() {
  for (const player of room.players.filter((item) => !item.isBot)) {
    saveProfile({ id: player.id, name: player.name, avatar: player.avatar, chips: player.chips, xp: player.xp });
  }
}

function advanceDealer() {
  if (!shouldPlayDealer(room)) return;
  room.phase = 'dealer';
  broadcast();
  const tick = () => {
    const hit = dealerStep(room);
    broadcast();
    if (hit) setTimeout(tick, 720);
    else {
      settleRound(room);
      saveHumans();
      setTimeout(broadcast, 350);
    }
  };
  setTimeout(tick, 650);
}

io.on('connection', (socket) => {
  const request = socket.request as express.Request;
  const profile = sessionProfile(request);
  const player = upsertPlayer(room, profile);
  socket.data.playerId = player.id;
  socket.join(room.id);
  broadcast();

  socket.on('place_bet', (amount: number) => {
    if (placeBet(room, player.id, Number(amount))) broadcast();
  });
  socket.on('clear_bet', () => {
    if (clearBet(room, player.id)) broadcast();
  });
  socket.on('deal', () => {
    if (!beginRound(room)) return;
    broadcast();
    setTimeout(() => {
      playBots(room);
      broadcast();
      advanceDealer();
    }, 1050);
  });
  socket.on('action', (action: 'hit' | 'stand' | 'double') => {
    if (!['hit', 'stand', 'double'].includes(action)) return;
    if (playerAction(room, player.id, action)) {
      broadcast();
      setTimeout(() => {
        playBots(room);
        broadcast();
        advanceDealer();
      }, 450);
    }
  });
  socket.on('new_round', () => {
    if (resetRound(room)) broadcast();
  });
  socket.on('chat', (message: string) => {
    if (addChat(room, player, String(message))) broadcast();
  });
  socket.on('disconnect', () => {
    const departing = disconnectPlayer(room, player.id);
    if (departing) saveProfile({ id: departing.id, name: departing.name, avatar: departing.avatar, chips: departing.chips, xp: departing.xp });
    saveHumans();
    broadcast();
    advanceDealer();
  });
});

if (isProduction) {
  app.use(express.static(join(process.cwd(), 'dist')));
  app.get('/{*splat}', (_req, res) => res.sendFile(join(process.cwd(), 'dist', 'index.html')));
}

server.listen(port, () => console.log(`Afterdark server listening on http://localhost:${port}`));
