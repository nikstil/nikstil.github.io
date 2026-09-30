# nikstil.com online features

Accounts, TRANSLATR™ speedrun and Daily Challenge leaderboards, and nikstil Messenger (real-time
DMs). The site stays a static GitHub Pages site; the online parts run on a Supabase project.

## Set up (once)

The admin page walks through the same steps, with copy buttons: **nikstil.com/nikstil/ → Online**.

1. **Database.** Supabase → **SQL Editor** → New query → paste all of [`schema.sql`](schema.sql) →
   **Run**. It's safe to run again whenever it changes.
2. **Sign-ups without email.** Supabase → **Authentication → Sign In / Providers → Email** → turn
   **Confirm email** off. Accounts are a username and password; each username gets a made-up address
   (`name@players.nikstil.com`) that is never emailed.
3. **Site URL.** Supabase → **Authentication → URL Configuration** → Site URL `https://nikstil.com`.
4. **Key.** Supabase → **Project Settings → API Keys** → copy the **publishable** key (or the legacy
   `anon` key). Paste it into the admin page's **Online** section and publish. Never use the
   **secret** / `service_role` key: the admin page refuses to publish one.
5. **Your admin account.** On nikstil.com, **Start → Account** → create your account (straight
   away, before anyone takes your name). Then in the SQL Editor:
   ```sql
   update public.profiles set is_admin = true where username = 'nikstil';
   ```
   The admin page's **Online → Moderation** then shows reports and runs, and can ban players and
   remove runs.

## How it fits together

| Piece | What it does |
| --- | --- |
| `supabase/schema.sql` | Tables, Row Level Security and the functions the site calls. Everything that writes goes through a function that checks who's asking and rate-limits. |
| `online/online.js` | The browser client (`window.nikstilOnline`), shared by the desktop, the game page and the admin page. Reads the project URL and key from `/site.json`. |
| `online/vendor/supabase-2.117.2.js` | The official Supabase JS client (MIT), pinned and served from this site. |
| `os/online-apps.js` | The Leaderboards, nikstil Messenger and Account windows on the desktop. |
| `online/translatr-bridge.js` | Loaded by `translatr/index.html`. Watches the game's save, tells the server when a speedrun or Daily Challenge starts and posts the time when it ends. On the results page after a speedrun, it shows live boards for that ending (left) and Any% (right). |
| `privacy/` | The privacy notice linked from sign-up. |

### Live leaderboards

Whenever a run finishes (or an admin removes a run or bans someone), the database announces it on
Supabase Realtime's public `leaderboard` channel (`notify_leaderboard` in `schema.sql`). Open
leaderboards (the desktop window and the game's results page) then fetch the new standings. If they
don't update live, check Supabase → **Realtime → Settings** still allows public channels.

### Keeping TRANSLATR™ connected

Uploading a new game build replaces `translatr/index.html`, which drops this line from its `<head>`:

```html
<script src="/online/translatr-bridge.js" defer></script>
```

Either add it back to the `index.html` in the game's own project (so every build has it), or open the
admin page → **Online** → **Reconnect**, which adds it back for you.

### About cheating

The server times every run itself, and a posted time has to match how long the server saw the run
take, so a time can't be typed in or edited afterwards. A browser game can't be made fully
cheat-proof, though: someone who scripts the requests (and waits the time out) could still post a
run they didn't play. Runs with the game's cheats on are never posted, and admins can remove runs.
