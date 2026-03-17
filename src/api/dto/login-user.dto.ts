import * as Joi from '@hapi/joi';
import { normalizeSlug } from '../../shared/slug/normalize-slug.util';

export class LoginUserDto {
  organizationSlug!: string;
  apartment!: string;
  block!: number;
  password!: string;
}

export const LoginUserSchema = Joi.object({
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
  apartment: Joi.string().required(),
  block: Joi.number().valid(1, 2).required(),
  password: Joi.string().min(1).max(100).required(),
});
