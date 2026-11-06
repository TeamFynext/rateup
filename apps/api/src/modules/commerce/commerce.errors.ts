export class ChannelNotFoundError extends Error {
  constructor(message = "Channel not found") {
    super(message);
    this.name = "ChannelNotFoundError";
  }
}
