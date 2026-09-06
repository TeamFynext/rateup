/** The WhatsApp mark as the loyalty design draws it — a filled glyph on a green tile. */
export function WhatsAppGlyph({ className = "size-3.5" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1a11 11 0 0 1-4.6-3.2c-1-1.2-1.5-2.3-1.6-3 0-.6.2-1.2.6-1.6.2-.2.4-.3.6-.3h.5c.2 0 .3.1.4.4l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6.5.9 1.6 1.9 2.6 2.3.2.1.4.1.5 0l.6-.6c.2-.2.3-.2.5-.1l1.4.7c.3.1.4.2.4.4s0 .6-.1.9Z" />
    </svg>
  );
}
