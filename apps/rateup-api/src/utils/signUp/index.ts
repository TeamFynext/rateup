interface FormField {
  id: string;
  value: string;
}

export function getValueByKey(
  formFields: FormField[],
  key: string,
): string | null {
  for (const field of formFields) {
    if (field.id === key) {
      return field.value;
    }
  }
  return null;
}
