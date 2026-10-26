"""Build the installable web app (index.html) from the game source.

The source file is the same page published as the Claude artifact. This script
gives it a proper <head> (app name, icons, manifest, theme colour), adds the
online scripts, and registers the service worker so the game installs to a home
screen and plays offline.

Usage: python3 tools/build_app.py
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "zebra-shift.source.html").read_text(encoding="utf-8")

# The artifact skeleton puts the reset styles in <head> and the page content in <body>
m = re.match(r"<!doctype html><html><head>(.*?)</head><body>\n?(.*)</body></html>\s*$", src, re.S)
if not m:
    raise SystemExit("Unexpected source layout: expected the artifact document skeleton.")
skeleton_head, body = m.group(1), m.group(2)
body = body.replace("<title>Zebra Shift</title>\n", "", 1)
body = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n', "", body, count=1)
skeleton_head = skeleton_head.replace("<meta charset=utf8>", "").replace(
    '<meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">', "")

head = f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Zebra Shift</title>
<meta name="description" content="An ER roguelike: diagnose, treat and survive the night shift.">
<meta name="theme-color" content="#1C6973">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Zebra Shift">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{skeleton_head}"""

# Online features: the Supabase client, the project settings and the friends/leaderboard screens.
# online.js does nothing until config.js holds the project values.
online = """<script src="vendor/supabase.js"></script>
<script src="config.js"></script>
<script src="online.js"></script>
"""

register = """<script>
// Offline play: register the service worker when served over http(s)
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
</script>
"""

out = f"<!doctype html>\n<html lang=\"en\">\n<head>\n{head}\n</head>\n<body>\n{body}{online}{register}</body>\n</html>\n"
(ROOT / "index.html").write_text(out, encoding="utf-8")
print("Wrote index.html", len(out), "bytes")
