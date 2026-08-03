export class ContactNotFoundError extends Error {
  constructor(message = "Contact not found") {
    super(message);
    this.name = "ContactNotFoundError";
  }
}
