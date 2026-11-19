// Client-side checks for quick feedback. The API repeats every rule and is the source of truth.

export type Errors = Record<string, string>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEmail(value: string): string | undefined {
  if (!value.trim()) return "Email is required.";
  if (!emailPattern.test(value.trim())) return "Enter a valid email address.";
}

/** Same policy as the API: 8+ characters, upper and lower case, a number and a symbol. */
export function checkPassword(value: string): string | undefined {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return "Use both upper and lower case letters.";
  if (!/\d/.test(value)) return "Include at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Include at least one symbol.";
}

export function required(value: string, label: string, min = 1): string | undefined {
  if (value.trim().length < min) return min > 1 ? `${label} must be at least ${min} characters.` : `${label} is required.`;
}

/** True when there are no error messages. */
export const isValid = (errors: Errors) => Object.values(errors).every((message) => !message);

/** Drop empty entries, so an error object only holds real messages. */
export function clean(errors: Record<string, string | undefined>): Errors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as Errors;
}
