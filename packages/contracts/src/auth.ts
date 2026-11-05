import { z } from 'zod';
import { UserRole } from './common';

// Pragmatic email shape check; deliverability is proven by the verification email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const Email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Enter your email address')
  .max(254, 'That email is too long')
  .regex(EMAIL_RE, 'Enter a valid email address');

/** A short list of the most common passwords (OWASP: reject known-breached/common passwords). */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'iloveyou',
  'admin123',
  'welcome1',
  'welcome123',
  'abc12345',
  '11111111',
  '00000000',
  'letmein1',
  'india123',
  'nxtwave123',
]);

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const Password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`)
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), {
    message: 'That password is too common. Try a longer phrase.',
  });

export const FullName = z
  .string()
  .trim()
  .min(1, 'Tell us your name')
  .max(80, 'Use at most 80 characters');

export const Timezone = z.string().trim().min(1).max(64);

// ---- Requests -------------------------------------------------------------

export const RegisterBody = z.object({ email: Email, password: Password, fullName: FullName });
export type RegisterBody = z.infer<typeof RegisterBody>;

/** Login does not apply the password policy, so old/odd passwords still get a generic error. */
export const LoginBody = z.object({ email: Email, password: z.string().min(1).max(PASSWORD_MAX) });
export type LoginBody = z.infer<typeof LoginBody>;

export const ForgotPasswordBody = z.object({ email: Email });
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBody>;

export const Token = z.string().min(20).max(200);

export const ResetPasswordBody = z.object({ token: Token, password: Password });
export type ResetPasswordBody = z.infer<typeof ResetPasswordBody>;

export const VerifyEmailBody = z.object({ token: Token });
export type VerifyEmailBody = z.infer<typeof VerifyEmailBody>;

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: Password,
});
export type ChangePasswordBody = z.infer<typeof ChangePasswordBody>;

export const AcceptInviteBody = z.object({ token: Token, fullName: FullName, password: Password });
export type AcceptInviteBody = z.infer<typeof AcceptInviteBody>;

export const UpdateProfileBody = z.object({
  fullName: FullName.optional(),
  timezone: Timezone.optional(),
});
export type UpdateProfileBody = z.infer<typeof UpdateProfileBody>;

// ---- Responses ------------------------------------------------------------

export const StudentMe = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  timezone: z.string(),
  emailVerified: z.boolean(),
  onboardingCompleted: z.boolean(),
  createdAt: z.string(),
});
export type StudentMe = z.infer<typeof StudentMe>;

export const StudentMeResponse = z.object({ user: StudentMe });
export type StudentMeResponse = z.infer<typeof StudentMeResponse>;

/** App bootstrap probe: always 200, `user` is null when signed out. */
export const StudentSessionResponse = z.object({ user: StudentMe.nullable() });
export type StudentSessionResponse = z.infer<typeof StudentSessionResponse>;

export const AdminMe = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: UserRole,
});
export type AdminMe = z.infer<typeof AdminMe>;

export const AdminMeResponse = z.object({ user: AdminMe });
export type AdminMeResponse = z.infer<typeof AdminMeResponse>;

export const AdminSessionResponse = z.object({ user: AdminMe.nullable() });
export type AdminSessionResponse = z.infer<typeof AdminSessionResponse>;

/** Which sign-in options are configured (drives the "Continue with Google" button). */
export const AuthProviders = z.object({
  google: z.boolean(),
  /** Current student sign-up policy, so the signup form can explain who may join. */
  registration: z.enum(['OPEN', 'ALLOWLIST', 'INVITE_ONLY']),
});
export type AuthProviders = z.infer<typeof AuthProviders>;
