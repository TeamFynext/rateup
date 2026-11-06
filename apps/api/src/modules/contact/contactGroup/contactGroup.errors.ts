export class ContactGroupNotFoundError extends Error {
  constructor(message = "Audience not found") {
    super(message);
    this.name = "ContactGroupNotFoundError";
  }
}
