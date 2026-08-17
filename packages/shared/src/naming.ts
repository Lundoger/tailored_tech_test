import { containsIllegalNameChar, MAX_NAME_LENGTH } from './constants';

export function splitFileName(name: string): { stem: string; extension: string } {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) {
    return { stem: name, extension: '' };
  }
  return { stem: name.slice(0, lastDot), extension: name.slice(lastDot) };
}

export function stripCopySuffix(stem: string): string {
  return stem.replace(/ \(\d+\)$/, '');
}

export function suggestAvailableName(desiredName: string, taken: Iterable<string>): string {
  const takenLower = new Set<string>();
  for (const entry of taken) {
    takenLower.add(entry.toLowerCase());
  }

  if (!takenLower.has(desiredName.toLowerCase())) {
    return desiredName;
  }

  const { stem, extension } = splitFileName(desiredName);
  const baseStem = stripCopySuffix(stem);

  for (let counter = 2; counter <= 1000; counter += 1) {
    const candidate = truncateName(`${baseStem} (${counter})${extension}`);
    if (!takenLower.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  throw new Error(`Could not find a free name for "${desiredName}"`);
}

export function truncateName(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) {
    return name;
  }
  const { stem, extension } = splitFileName(name);
  return `${stem.slice(0, MAX_NAME_LENGTH - extension.length)}${extension}`;
}

export function validateNodeName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return 'Name cannot be empty.';
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Name cannot be longer than ${MAX_NAME_LENGTH} characters.`;
  }
  if (containsIllegalNameChar(trimmed)) {
    return 'Name cannot contain / \\ : * ? " < > |';
  }
  if (trimmed === '.' || trimmed === '..') {
    return 'Name cannot be "." or "..".';
  }

  return null;
}
