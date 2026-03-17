import * as Joi from '@hapi/joi';
import { UserRole } from '../entities/user.entity';
import { normalizeSlug } from '../../shared/slug/normalize-slug.util';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../shared/validation/password-policy';

export class CreateUserDto {
  organizationSlug!: string;
  name!: string;
  email?: string | null;
  password!: string;
  apartment!: string;
  block!: number;
  role!: UserRole;
}

export const CreateUserSchema = Joi.object({
  organizationSlug: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      if (!normalizeSlug(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'organization slug normalization')
    .messages({ 'any.invalid': 'organizationSlug must contain at least one alphanumeric character' }),
  name: Joi.string().required(),
  email: Joi.string().trim().email().allow('', null).optional(),
  password: Joi.string()
    .pattern(PASSWORD_POLICY_REGEX)
    .required()
    .messages({
      'string.pattern.base': PASSWORD_POLICY_MESSAGE,
    }),
  apartment: Joi.string().required(),
  block: Joi.number().valid(1, 2).required(),
  role: Joi.string().valid(UserRole.ADMIN, UserRole.RESIDENT).default(UserRole.RESIDENT),
});
