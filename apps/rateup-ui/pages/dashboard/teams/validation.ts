function validateNameAndEmail(name: string, email: string): Record<string, string> {
  let errors: Record<string, string> = {};

  // Validate name
  if (!name) {
    errors.name = "Name is required.";
  }

  // Validate email
  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Invalid email format.";
  }

  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default validateNameAndEmail;