import * as Joi from '@hapi/joi';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../shared/validation/password-policy';

export class ForgotPasswordRequestDto {
  organizationSlug!: string;
  email!: string;
  redirectUrl?: string;
}

export const ForgotPasswordRequestSchema = Joi.object({
  organizationSlug: Joi.string().trim().required(),
  email: Joi.string().trim().email().max(100).required(),
  redirectUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(1000).optional(),
});

export class ForgotPasswordConfirmDto {
  organizationSlug!: string;
  token!: string;
  newPassword!: string;
}

export const ForgotPasswordConfirmSchema = Joi.object({
  organizationSlug: Joi.string().trim().required(),
  token: Joi.string().trim().min(20).max(512).required(),
  newPassword: Joi.string()
    .pattern(PASSWORD_POLICY_REGEX)
    .required()
    .messages({
      'string.pattern.base': PASSWORD_POLICY_MESSAGE,
    }),
});
