/**
 * Raised when a channel is not mapped to a catalog, or is mapped to one outside
 * the caller's org.
 *
 * A typed error so the controller can answer 400 by CLASS rather than by
 * substring-matching an arbitrary error's own message text. Both failures carry
 * the SAME message: the pair used to be distinguishable, which made it an
 * existence oracle for arbitrary phoneIds. See issues.txt 19.3 and 19.10.
 *
 * Its own module so a test that mocks commerce.service.js still gets the real
 * class.
 */
export class ChannelNotFoundError extends Error {
  constructor(message = "Channel not found") {
    super(message);
    this.name = "ChannelNotFoundError";
  }
}
