# cipher-chat

An open-source, early-2000s-style social network where the messages are end-to-end encrypted.
Customizable profiles, friends, a Top 8, comments, bulletins, and an AIM-style chat window.
The server only ever stores and forwards ciphertext.

## What's in it

- **Accounts**: username + password (argon2), session cookie.
- **Profiles you customize without code**: pick a theme (Gothic Rose, Hot Pink Glitter, Hacker Green, ...), change colors, pattern, font, box style, glitter name, cursor trail, scrolling banner, mood, now playing, about me, and a Top 8. There's a live preview while you edit. The server only keeps whitelisted values, so nobody can inject CSS or HTML.
- **Friends**: requests, accept/decline, remove, **blocking**, people search, "cool new people".
- **Bulletins and wall comments** with timestamps.
- **Encrypted DMs** with history, message bubbles, autoscroll, date separators, **typing dots**, **online / last seen**, **sent / delivered / read** ticks, unread badges and a message sound.
- **Safety numbers**: compare key fingerprints with a friend. If a friend's key changes, chat is paused with a warning until you trust the new key.

## How the encryption works

1. Each account gets an ECDH (P-256) keypair in your browser. The private key is non-extractable and lives in IndexedDB (one identity per account).
2. Your browser publishes only the public key.
3. To chat, your browser derives a shared secret with your friend's public key, runs it through HKDF (SHA-256) and gets an AES-256-GCM key.
4. Each message is encrypted with a fresh random IV. The sender and recipient usernames are bound in as authenticated data, so the server can't replay a message into another conversation.
5. The server stores `iv`, `ciphertext` and the two public keys that were used, so history keeps decrypting even if a friend later gets a new key.
6. Each message also records which public keys were used. Incoming messages signed with a key you never trusted get a warning.

## Run it

    python3 -m venv .venv
    source .venv/bin/activate.fish      # bash/zsh: source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn backend.main:app --port 8000

Open `http://127.0.0.1:8000`. To try it alone, use two different browser profiles (or a normal and a private window) and make two accounts.

The old separate relay (`server.py`) is gone: the websocket now lives in the same server at `/ws`.

## Tests

    pip install -r requirements-dev.txt
    python -m unittest discover -s tests -v

Covers auth, the theme whitelist, avatar validation, friends, blocking, privacy of presence, posts, comments, key directory, and the websocket (typing, delivered/read, offline delivery, strangers, bad Origin).

## Project layout

    backend/
      main.py        app + static files
      auth.py        signup / login / logout
      profiles.py    profiles, themes, avatars
      theme.py       theme whitelist
      friends.py     friends, blocking, people search
      posts.py       bulletins + wall comments
      messages.py    public keys + encrypted history
      realtime.py    websocket: messages, typing, presence, receipts
      hub.py         who is connected
      db.py          sqlite schema (+ small migrations)
    web/
      js/            crypto, socket, state, theme, router, views/
      css/           site, profile, chat

## Limitations

This is a learning project, not Signal.

- Your private key lives in one browser. Logging in somewhere else creates a new key, and older messages can't be read there.
- No forward secrecy (no ratchet yet): a stolen private key decrypts that conversation's history.
- The server still sees metadata: who talks to whom, when, and message sizes.
- Chats are 1-to-1 and friends-only.
- You verify keys by comparing safety numbers yourself.

## Roadmap

- [x] HKDF key derivation
- [x] Accounts, usernames, rooms (as friends-only DMs)
- [x] Nicer UI
- [ ] Forward secrecy with a ratchet
- [ ] Encrypted key backup for multiple devices
- [ ] Group chats
