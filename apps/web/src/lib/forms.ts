import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from './api-error';

export function applyServerFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  fieldNames: readonly Path<TFieldValues>[],
): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const fieldErrors = error.fieldErrors;
  if (fieldErrors) {
    let applied = false;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const name = field as Path<TFieldValues>;
      if (fieldNames.includes(name) && messages[0]) {
        setError(name, { type: 'server', message: messages[0] });
        applied = true;
      }
    }
    if (applied) return true;
  }

  const codeToField: Partial<Record<string, Path<TFieldValues>>> = {
    EMAIL_ALREADY_REGISTERED: 'email' as Path<TFieldValues>,
  };
  const target = codeToField[error.code];
  if (target && fieldNames.includes(target)) {
    setError(target, { type: 'server', message: error.message });
    return true;
  }

  return false;
}
