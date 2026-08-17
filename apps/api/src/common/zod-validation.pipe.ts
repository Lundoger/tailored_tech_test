import { Injectable, type PipeTransform } from '@nestjs/common';
import type { ValidationDetails } from '@data-room/shared';
import type { ZodType } from 'zod';

import { AppError } from './app-error';

@Injectable()
export class ZodValidationPipe<TSchema extends ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const fields: ValidationDetails = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        (fields[key] ??= []).push(issue.message);
      }
      throw AppError.validationFailed(fields);
    }

    return result.data;
  }
}
