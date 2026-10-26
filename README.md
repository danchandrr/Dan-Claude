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

The installed app opens full screen with its own icon and keeps working without a connection. Saves stay on the device; use **Back up or import a save** in the main menu to move a career between devices.

### Download it

`index.html` is the whole game in one file. Download it and open it in a browser to play offline. (Installing and automatic updates need the hosted link.)

## Switch on GitHub Pages (one time)

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose the branch that holds these files and the **/ (root)** folder, then **Save**.
4. After a minute or two the page shows the live address.

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
| `tools/build_app.py` | Rebuilds `index.html` from the source |
