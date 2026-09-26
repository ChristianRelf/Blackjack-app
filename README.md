# Afterdark Blackjack

A compact, real-time community blackjack table built around the supplied card, rank, icon, and sound packs. It supports a polished guest mode out of the box and Discord OAuth profiles when credentials are configured.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The guest table is immediately playable with three house regulars so the room does not feel empty.

For a production-style run:

```bash
npm run build
npm start
```

The server defaults to `http://localhost:3001` and serves both the built client and the supplied assets.

## Discord sign-in

1. Create an application in the Discord Developer Portal.
2. Under OAuth2, add `http://localhost:3001/api/auth/discord/callback` as a redirect.
3. Copy `.env.example` to `.env` and add the client ID, client secret, a long random session secret, and the matching redirect URI.
4. Restart the server. The **Connect Discord** control now performs the real OAuth flow and uses the Discord display name/avatar at the table.

For HTTPS deployment, set `CLIENT_ORIGIN` and `DISCORD_REDIRECT_URI` to the public HTTPS URLs and set `COOKIE_SECURE=true`.

## What is implemented

- Server-authoritative six-deck blackjack with S17 rules, 3:2 naturals, doubling, synchronized betting/actions, and reconnect-safe chip/XP profiles.
- Socket.IO multiplayer rooms, live table chat, player presence, persistent file-backed sessions, and Discord OAuth.
- Bronze, Silver, Gold, and Black progression using the supplied rank insignia frames.
- The supplied 52-card set with deal/flip motion and the supplied OGG card, shuffle, chip, and stack sounds.
- The supplied game-icon family throughout the blackjack controls: shuffle, hit, stand, double, chip stack, award, shield, suit, tag, shoe, timer/policy, player, and house-rule states.
- Responsive desktop and phone layouts, keyboard actions (`H`, `S`, `D`), sound muting, reduced-motion support, and a guest-ready demo table.

## Dealer model

`server/dealerModel.ts` contains a frozen multi-layer neural policy that evaluates hand shape and shoe pressure. The model drives confidence/telemetry while the final dealer action stays constrained by the posted S17 rules. That keeps play auditable and fair. It makes no generative-AI or third-party model calls.

All chips are play-money and have no cash value.
