/** Mirrors the backend's STRONG_PASSWORD_REGEX (apps/backend/src/auth/dto/register.dto.ts) rule
 * by rule, so registration and password-reset never drift out of sync with what the server
 * actually accepts. */
export const PASSWORD_RULES = [
  { label: 'Pelo menos 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Uma letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Uma letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Um número', test: (v: string) => /\d/.test(v) },
  { label: 'Um caractere especial (@, #, $...)', test: (v: string) => /[^A-Za-z0-9\s]/.test(v) },
];
