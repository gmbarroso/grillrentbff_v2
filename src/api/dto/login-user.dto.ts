import * as Joi from '@hapi/joi';

export class LoginUserDto {
  organizationSlug!: string;
  apartment!: string;
  block!: number;
  password!: string;
}

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

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
  password: Joi.string().min(8).max(12).required(),
});
