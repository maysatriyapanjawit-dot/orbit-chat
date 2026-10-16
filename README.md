# Orbit Chat

A Discord-inspired text chat starter with a responsive dark interface. All branding and sample identities are fictional. No personal information from the project request is included.

## What works

- People create their own username and password; no email or real name required.
- Usernames are unique across this server, ignoring capitalisation (CosmicFox and cosmicfox are the same name).
- Four shared channels: general, gaming, creative and random.
- Messages arrive live for other signed-in users through Server-Sent Events.
- Accounts and the latest 5,000 messages are saved on the server.
- Users can delete only their own messages.
- Mobile channel drawer, emoji button, character limit and keyboard sending.
- Salted password hashing, HTTP-only sessions, server-side validation and basic rate limits.
- No third-party dependencies, external fonts, analytics, or API keys.

This is a small-community starter, not a complete Discord replacement. There are no voice/video calls, direct messages, file attachments, password recovery, admin moderation, or end-to-end encryption. Everyone signed in can read all channels. Use a nickname and avoid posting sensitive information. Registration is open to anyone with the server URL.

## 1. Try real chat on your computer

1. Install a supported Node.js version, 22 or newer, from https://nodejs.org/.
2. Extract the ZIP.
3. Open a terminal inside the `orbit-chat` folder (the folder containing `package.json`).
4. Run:

```sh
npm start
```

5. Open http://localhost:3000 and create an account.
6. Open a private/incognito browser window, create a different account, and send messages between the two windows.

No `npm install` is needed because the app uses built-in Node modules. `npm test` runs the integration checks. `localhost` works only on your own computer; sending that address to a friend will not connect them to your server. Use the hosting steps below for friends on different networks.

## 2. Put the code on GitHub (no terminal required)

1. Sign in at https://github.com/ and choose **+ → New repository**.
2. Name it `orbit-chat`. Choose Public if you want to use the usual public-repository GitHub Pages setup. A public repository exposes the source code, not the live server's private data folder.
3. Create the repository.
4. Choose **uploading an existing file** on the empty-repository screen, or **Add file → Upload files**.
5. Open the extracted `orbit-chat` folder. Drag its contents into GitHub, preserving the `docs` and `test` folders. `package.json`, `server.js` and `README.md` must be at the repository's top level. Upload the files, not the ZIP and not an extra enclosing folder.
6. Include `.gitignore` (your file browser might hide it). Never upload a `data` folder if you have already run the server; it contains account hashes and chat history. Also exclude `.env` and log files.
7. Click **Commit changes**. If GitHub asks for a branch name, use `main`.

Alternative terminal method, from inside the extracted project, after creating an empty repository:

```sh
git init
git add .
git commit -m "Add Orbit Chat"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/orbit-chat.git
git push -u origin main
```

Replace YOUR-USERNAME with your GitHub username. Do not paste a password or token into any project file. GitHub may require sign-in through your browser or credential manager.

## 3. Let other people chat — deploy the server

GitHub stores your code. **GitHub Pages cannot run this Node server.** For actual shared chat, deploy the repository as a Node web service. Here is one option using Render:

1. Open https://render.com/ and sign in. Connect your GitHub repository when prompted.
2. Choose **New → Web Service**, then select `orbit-chat`.
3. Select the Node runtime and leave Root Directory blank.
4. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
5. Set environment variable `NODE_ENV` to `production`. This enables Secure session cookies; use the host's HTTPS URL.
6. For durable accounts and messages, choose a service supporting a persistent disk. Mount the disk at `/var/data` and set `DATA_DIR` to `/var/data/orbit-chat`. Check the provider's current price before choosing a plan. Without persistent storage, accounts and messages can disappear during a redeploy or restart on an ephemeral host.
7. Deploy and wait for the service to become ready.
8. Open the HTTPS service URL Render gives you. Share **that URL** with friends. Each person registers a different username and a password.
9. Test from two devices: register different names, send a message, switch channels, and verify messages appear on both devices.

The service uses `PORT` supplied by the host and listens on `0.0.0.0`. Run **one server instance only**: JSON storage and live events are local to that instance. Multiple instances require a shared database and message broker. Sessions expire after 24 hours and reset after a server restart; saved accounts remain when the data directory is durable.

The server stores passwords as salted scrypt hashes, not plaintext. Messages are plaintext on the server; the host administrator can read them. Back up your data directory privately. Basic rate limiting uses the connection address and account identity; behind a reverse proxy, auth limits may be shared by visitors. A larger public deployment needs stronger abuse controls, account recovery, moderation and a database.

## 4. Optional: show a demo on GitHub Pages

This is for previewing the interface. It does **not** connect visitors to one another.

1. In your GitHub repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/docs**, then **Save**.
4. Wait for deployment, then use the link GitHub shows (usually `https://YOUR-USERNAME.github.io/orbit-chat/`).
5. The app displays a LOCAL DEMO banner. Sample users are fictional; anything you type stays in the current tab and disappears on reload.

For a custom Pages domain, add `?demo=1` to the URL to explicitly select demo mode. You can also open `docs/index.html` directly to preview the interface. For real chat, use the web-service URL from step 3 rather than the Pages link.

## Files

- `server.js` — accounts, sessions, storage and live-chat API.
- `docs/index.html`, `docs/style.css`, `docs/app.js` — interface and local demo.
- `test/chat.test.js` — multi-user, duplicate-name, permissions, live-event and persistence tests.
- `.gitignore` — excludes runtime data and secrets.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listening port |
| `DATA_DIR` | `./data` | Private writable storage directory |
| `NODE_ENV` | unset | Set to `production` for HTTPS hosting |

Messages use plain text rendering; pasted HTML is not executed. Usernames accept 3–20 ASCII letters, numbers or underscores. Passwords require 10–128 characters. Names are unique within one deployed server, not globally across independent copies of this project.

## Validation

The included integration test passed for two users exchanging messages, live event delivery, case-insensitive username conflicts (including simultaneous registrations), login rejection, message permissions, channel and length validation, private data path blocking, logout and restart persistence. JavaScript syntax checks also passed. Browser visual testing could not be completed in the build environment because its browser download was unavailable.

## Official deployment references

- GitHub: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Render: https://render.com/docs/web-services
- Render persistent disks: https://render.com/docs/disks
