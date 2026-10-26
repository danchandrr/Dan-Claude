# Zebra Shift

An ER roguelike for clinicians. Diagnose, treat and survive the night shift: order history, exam, tests and imaging, name the diagnosis, pick the treatment, do the bedside procedures and send each patient to the right place. Common cases keep you alive. Zebras make you a legend.

This folder is the installable web app version. It plays in any modern browser, installs to a phone or computer like a normal app, and works offline after the first visit.

## Play it

Once GitHub Pages is switched on (below), the game lives at:

**https://danchandrr.github.io/Dan-Claude/**

### Install it as an app

- **Android (Chrome):** open the link, tap the ⋮ menu, then **Install app** (or **Add to Home screen**).
- **iPhone or iPad (Safari):** open the link, tap **Share**, then **Add to Home Screen**.
- **Windows, Mac or Linux (Chrome or Edge):** open the link and click the install icon at the right of the address bar.

The installed app opens full screen with its own icon and keeps working without a connection. Saves stay on the device. To move a career, sign in under **Friends & leaderboards** (once online features are switched on, below), or use **Back up or import a save** in the main menu.

### Download it

`index.html` is the whole game in one file. Download it and open it in a browser to play offline. (Installing and automatic updates need the hosted link.)

## Switch on GitHub Pages (one time)

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose the branch that holds these files and the **/ (root)** folder, then **Save**.
4. After a minute or two the page shows the live address.

## Switch on friends and leaderboards (one time, free)

The online features (sign-in, friends, an all-time leaderboard, a daily leaderboard for Case of the day, and cloud saves that follow you between devices) run on a free [Supabase](https://supabase.com) project. Until it is set up, the game simply hides the **Friends & leaderboards** button and plays offline.

1. **Create the project.** Sign up at supabase.com, click **New project**, give it a name and a database password, and pick the region nearest your players. Wait a minute for it to start.
2. **Create the tables.** Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, and click **Run**. It should say *Success. No rows returned.*
3. **Set the web address.** Open **Authentication → URL Configuration**. Set **Site URL** to `https://danchandrr.github.io/Dan-Claude/` and add the same address under **Redirect URLs**.
4. **Send a code in the sign-in email.** Open **Authentication → Emails → Magic Link** and make sure the message contains `{{ .Token }}`, for example:
   `<p>Your Zebra Shift sign-in code is <b>{{ .Token }}</b></p><p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>`
   Players type the code into the game, which works even inside the installed app where email links open a different browser.
5. **Connect the game.** Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `config.js`, then commit and push. (The anon key is meant to be public. The database rules in `schema.sql` decide what each player can read and write.)
6. **Optional: Google sign-in.** Under **Authentication → Providers → Google**, follow Supabase's steps to add a Google client ID, then set `google: true` in `config.js`.

The free plan's built-in email sender only sends a few sign-in emails an hour. Once more people are playing, add your own SMTP service under **Authentication → Emails → SMTP Settings**.

Scores are reported by each player's own device, so a determined player could fake one. That's fine for friends comparing results, but they aren't proof of anything.

## Put it in the app stores

The game is a Progressive Web App, so it can be packaged without rewriting it:

1. Go to **https://www.pwabuilder.com** and paste the live address.
2. Pick a store: **Google Play** (an Android package), **Microsoft Store**, or **iOS** (an Xcode project you build on a Mac).
3. Follow its steps. You need your own developer accounts: Google Play has a one-time fee, Apple charges yearly, and Microsoft is free for individuals.

Before submitting a medical-themed game, add a short disclaimer to the store listing that it is for education and entertainment, not clinical guidance.

## Notes

- **Talking to staff:** inside claude.ai the co-workers are played live by Claude. In this standalone app there is no Claude connection, so they use their written lines. Everything else works the same.
- **Updating the app:** the game source is `zebra-shift.source.html` (the same page as the Claude artifact). After changing it, run `python3 tools/build_app.py` to rebuild `index.html`, and bump `VERSION` in `sw.js` so installed copies pick up the new build.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The playable app, built from the source |
| `zebra-shift.source.html` | Game source, identical to the Claude artifact |
| `manifest.webmanifest` | App name, colours and icons for installing |
| `sw.js` | Service worker for offline play |
| `icons/` | App icons |
| `online.js` | Sign-in, friends, leaderboards and cloud saves |
| `config.js` | Your Supabase project values (empty means offline only) |
| `supabase/schema.sql` | Database tables and access rules for the online features |
| `vendor/` | The Supabase client library (MIT licence) |
| `privacy.html` | Privacy notice shown at sign-in |
| `tools/build_app.py` | Rebuilds `index.html` from the source |
