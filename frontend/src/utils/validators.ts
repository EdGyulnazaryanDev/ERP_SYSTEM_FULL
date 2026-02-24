export const emailValidator = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const phoneValidator = (phone: string): boolean => {
  const regex = /^[\d\s\-\+\(\)]+$/;
  return regex.test(phone);
};

export const urlValidator = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const requiredValidator = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const minLengthValidator = (value: string, min: number): boolean => {
  return value.length >= min;
};

export const maxLengthValidator = (value: string, max: number): boolean => {
  return value.length <= max;
};

export const rangeValidator = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};
