function validateNameAndEmail(name: string, email: string, translations: any) {
  let errors: Record<string, string> = {};

  // Validate name
  if (!name) {
    errors.name = translations("Name is required.");
  }

  if (name && name.length < 3) {
    errors.name = translations("Name (min 3 characters)");
  }

  // Validate email
  if (!email) {
    errors.email = translations("Email is required.");
  } else if (!isValidEmail(email)) {
    errors.email = translations("Invalid email format.");
  }

  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default validateNameAndEmail;
