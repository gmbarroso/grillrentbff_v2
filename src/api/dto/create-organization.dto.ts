import * as Joi from '@hapi/joi';
import { normalizeSlug } from '../../shared/slug/normalize-slug.util';

export class CreateOrganizationDto {
  name!: string;
  slug?: string;
  address?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  openingTime?: string;
  closingTime?: string;
  logoUrl?: string;
}

export const CreateOrganizationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string()
    .trim()
    .optional()
    .custom((value, helpers) => {
      if (value === undefined) return value;
      if (!normalizeSlug(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'organization slug normalization')
    .messages({ 'any.invalid': 'slug must contain at least one alphanumeric character' }),
  address: Joi.string().max(1000).allow('', null).optional(),
  email: Joi.string().email().allow('', null).optional(),
  phone: Joi.string().max(40).allow('', null).optional(),
  timezone: Joi.string().max(64).default('America/Sao_Paulo'),
  openingTime: Joi.string().pattern(/^\d{2}:\d{2}$/).allow('', null).optional(),
  closingTime: Joi.string().pattern(/^\d{2}:\d{2}$/).allow('', null).optional(),
  logoUrl: Joi.string().uri().allow('', null).optional(),
});
