const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeInput(input: string): string {
  return input.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(sanitizeInput(email));
}

export function validatePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6;
}

export function validateStringLength(
  value: string,
  minLength: number,
  maxLength: number,
): boolean {
  const sanitized = sanitizeInput(value);
  return sanitized.length >= minLength && sanitized.length <= maxLength;
}

export function validateIsoDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function validateMinimumAge(
  isoDate: string,
  minimumAgeYears = 13,
): boolean {
  if (!validateIsoDate(isoDate)) return false;

  const [year, month, day] = isoDate
    .split("-")
    .map(Number) as [number, number, number];
  const birthDate = new Date(year, month - 1, day);

  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDifference = today.getMonth() - (month - 1);
  const dayDifference = today.getDate() - day;

  if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
    age -= 1;
  }

  return age >= minimumAgeYears;
}
