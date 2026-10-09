# RateUp app on Make

The custom app Make users add to their scenarios. `definition.mjs` holds the whole app as
data; `deploy.mjs` pushes it to Make through Make's SDK Apps API. The app calls RateUp's
Make API at `/api/integration/external/make` (`src/modules/integrations/external/make/`).
Change the two together.

## What it contains

- **Connection:** one API key from RateUp (Settings → Integrations → Make). The key carries
  the workspace, so nothing else is asked. Make checks it against `GET /me` and labels the
  connection with the workspace name.
- **11 instant triggers**, each on its own webhook. Turning a scenario on attaches the hook
  (`POST /hooks`); turning it off detaches it (`DELETE /hooks/:id`). They carry the same
  payloads Zapier gets.
- **Actions:** create, update and delete a contact; set its lifecycle; add it to a group; send
  a WhatsApp template; send a WhatsApp text.
- **Search:** contacts by exact phone or email.
- **Dropdowns** (RPCs): teams, contact groups, lifecycles, approved templates.

## Deploying

1. In Make: profile → **API access** → **Add token**, with the `sdk-apps:read` and
   `sdk-apps:write` scopes.
2. Note your zone from Make's URL (`https://eu2.make.com/…` → `eu2`).
3. From `rateup-api/`:

   ```sh
   MAKE_API_TOKEN=… MAKE_ZONE=eu2 RATEUP_API_URL=https://<public API address> npm run make:deploy
   ```

   Run it again after any change: what exists is updated, what is missing is created.
   `node make-app/deploy.mjs --print` shows the generated components without calling Make.

`RATEUP_API_URL` is baked into the app, so Make can only reach the RateUp API it names: a dev
tunnel (public, running) while developing, the production API for the real app.

## Sharing

A new app is private to the Make account that deployed it. To let other Make accounts use it,
share it with an invite link from the app's page in Make. Listing it for every Make user goes
through Make's app review.
