# Backfills

One-off data repairs. **Nothing in here is applied by `prisma migrate`** — these are
run by hand, against a named database, when someone has decided to.

That is the point: each of these rewrites rows in bulk and holds locks while it
does, so it wants a maintenance window and a person watching, not a deploy step.
Run the bounded ones with `psql -1 -f <file>` — the `-1` wraps the file in a
transaction, so a failure part-way leaves nothing behind.

Run the batched ones with plain `psql -f <file>`, **without** `-1`: they commit each
batch as they go, which is the whole point, and `COMMIT` inside a `DO` block is an
error if psql has already opened a transaction around it. Each is written to be
interrupted and re-run.

Code never depends on one of these having been run. A backfill converges old rows
onto what the code already writes for new ones; until it runs, the old rows are
merely stale, never broken.

| File                                         | What it repairs                                                                                 | Cost                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `2026-09-12-fix-echo-source-identifier.sql`  | Messages echoed from the WhatsApp Business app recorded the customer as the channel they ran on | Bounded by the damage — two statements, seconds; `psql -1 -f`                        |
| `2026-09-12-normalise-source-identifier.sql` | The same number stored in four different spellings, so `=` between two of them is a coin flip   | Rewrites millions of rows; batched and resumable — run with plain `psql -f`, no `-1` |

Run them in that order: the normalisation assumes the echo rows already name the
right number.
