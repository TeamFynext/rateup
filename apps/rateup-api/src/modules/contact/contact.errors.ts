/**
 * Raised when a contact is not the caller's, or does not exist. Handlers answer
 * 404: a contact another org owns should be indistinguishable from one that never
 * existed. See issues.txt 18.5 and 18.10.
 *
 * Its own module so a test that mocks contact.service.js still gets the real
 * class, and so importing it does not drag the service's dependency graph along.
 */
export class ContactNotFoundError extends Error {
  constructor(message = "Contact not found") {
    super(message);
    this.name = "ContactNotFoundError";
  }
}
