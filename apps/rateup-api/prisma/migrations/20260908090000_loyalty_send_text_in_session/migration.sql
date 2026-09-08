-- Whether a loyalty notification may go out as a plain text message when the
-- customer has an open 24-hour customer-service window.
--
-- Loyalty notifications are Meta templates: each needs Meta's approval before it
-- can be sent, and a template sent outside an open window is billed. Inside the
-- window a free-form text message is both free and immediate — so the dispatcher
-- can send the template's body as text there and fall back to the template only
-- when the window is closed. Merchants who want the template every time (for its
-- header, footer or buttons, or for consistent branding) turn this off.
--
-- Default true: the saving and the "works before approval" behaviour are what a
-- merchant expects, and a template with buttons is never downgraded regardless.

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "sendTextInSession" BOOLEAN NOT NULL DEFAULT true;
