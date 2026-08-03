export class ContactGroupNotFoundError extends Error {
  constructor(message = "Contact group not found") {
    super(message);
    this.name = "ContactGroupNotFoundError";
  }
}
