/**
 * Raised when a contact group — or a team named alongside it — is not the caller's.
 * Handlers answer 404: a group another org owns should be indistinguishable from
 * one that never existed. See issues.txt 18.24 and 18.25.
 *
 * Its own module so a test that mocks contactGroup.service.js still gets the real
 * class, and so importing it does not drag the service's dependency graph along.
 */
export class ContactGroupNotFoundError extends Error {
  constructor(message = "Contact group not found") {
    super(message);
    this.name = "ContactGroupNotFoundError";
  }
}
