export const PLAYER_NAME_MAX_LENGTH = 20;

/** Letters (any alphabet), digits, spaces and a few separators. */
const ALLOWED_NAME = /^[\p{L}\p{N}][\p{L}\p{N} '._-]*$/u;

export type PlayerNameValidation =
  | { readonly isValid: true; readonly name: string }
  | { readonly isValid: false; readonly error: string };

/** Trims and collapses spaces, then checks length and characters. */
export function validatePlayerName(rawName: string): PlayerNameValidation {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (name.length === 0) return { isValid: false, error: 'Captain name is required.' };
  if (name.length > PLAYER_NAME_MAX_LENGTH) {
    return { isValid: false, error: `Captain name must have at most ${PLAYER_NAME_MAX_LENGTH} characters.` };
  }
  if (!ALLOWED_NAME.test(name)) {
    return {
      isValid: false,
      error: "Use letters, numbers, spaces and . _ - ' only, starting with a letter or number.",
    };
  }
  return { isValid: true, name };
}

/** Friendly default suggestion such as "Captain 4821". */
export function suggestPlayerName(random: () => number = Math.random): string {
  return `Captain ${1000 + Math.floor(random() * 9000)}`;
}
