-- This is an empty migration.
CREATE INDEX idx_wamessage_body_reaction_msgid_1 ON "WaMessage"((("messageBody"->'receive'->'reaction'->>'mid')));
CREATE INDEX idx_wamessage_body_reaction_msgid_2 ON "WaMessage"((("messageBody"->'send'->'payload'->>'message_id')));
CREATE INDEX idx_wamessage_body_reaction_msgid_3 ON "WaMessage"((("messageBody"->'receive'->'messages'->0->'reaction'->>'message_id')));
CREATE INDEX idx_wamessage_body_reaction_msgid_4 ON "WaMessage"((("messageBody"->'send'->'reaction'->>'message_id')));