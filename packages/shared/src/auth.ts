import { z } from 'zod';

import { emailSchema } from './primitives';

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(200, 'That password is too long.');

export const registerInputSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, 'Enter your name.').max(120),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
