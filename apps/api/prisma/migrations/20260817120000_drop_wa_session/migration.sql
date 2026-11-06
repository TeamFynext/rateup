-- Drops `WaSession`, the last of the pre-flow_token run state.
--
-- A row here held one in-flight WhatsApp survey/flow run, keyed by
-- `(phone, orgId)` — one live run per person per org, and a database write on
-- every send. Run context now travels in the signed `flow_token` (flowToken.ts)
-- and the in-progress answers live in Redis (flowState.ts), so nothing reads
-- or writes this table any more.
--
-- Rows still present are runs that were open when the token migration
-- deployed; their answers were only ever worth having until the run finished,
-- so they are dropped with the table.

DROP TABLE "WaSession";
