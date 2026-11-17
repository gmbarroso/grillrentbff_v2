import * as Joi from '@hapi/joi';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { PASSWORD_POLICY_REGEX } from '../../shared/validation/password-policy';
import { normalizeSlug } from '../../shared/slug/normalize-slug.util';
type BillingCycle = 'monthly' | 'annual';

export interface CreateOnboardingDto {
  organization: {
    name: string;
    slug: string;
    address?: string;
    postalCode?: string;
    street?: string;
    addressNumber?: string;
    neighborhood?: string;
    city?: string;
    stateCode?: string;
    phone?: string;
  };
  administrator: { name: string; email: string; password: string };
  unitCount: number;
  planId: string;
  billingCycle: BillingCycle;
  pricingVersion: string;
}
const slug = Joi.string()
  .trim()
  .max(120)
  .custom(
    (value, helpers) => normalizeSlug(value) || helpers.error('any.invalid'),
  )
  .required();
export const CreateOnboardingSchema = Joi.object({
  organization: Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    slug,
    address: Joi.string().trim().max(1000).allow('').optional(),
    postalCode: Joi.string()
      .trim()
      .pattern(/^\d{8}$/)
      .allow('')
      .optional(),
    street: Joi.string().trim().max(200).allow('').optional(),
    addressNumber: Joi.string().trim().max(20).allow('').optional(),
    neighborhood: Joi.string().trim().max(120).allow('').optional(),
    city: Joi.string().trim().max(120).allow('').optional(),
    stateCode: Joi.string()
      .trim()
      .uppercase()
      .valid(
        '',
        'AC',
        'AL',
        'AP',
        'AM',
        'BA',
        'CE',
        'DF',
        'ES',
        'GO',
        'MA',
        'MT',
        'MS',
        'MG',
        'PA',
        'PB',
        'PR',
        'PE',
        'PI',
        'RJ',
        'RN',
        'RS',
        'RO',
        'RR',
        'SC',
        'SP',
        'SE',
        'TO',
      )
      .optional(),
    phone: Joi.string().trim().max(40).allow('').optional(),
  }).required(),
  administrator: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().trim().lowercase().email().max(100).required(),
    password: Joi.string().max(100).pattern(PASSWORD_POLICY_REGEX).required(),
  }).required(),
  unitCount: Joi.number().integer().min(1).max(100000).required(),
  planId: Joi.string().max(80).required(),
  billingCycle: Joi.string().valid('monthly', 'annual').required(),
  pricingVersion: Joi.string().max(40).required(),
});
export const PurchaseRequestSchema = Joi.object({
  planId: Joi.string().max(80).required(),
  billingCycle: Joi.string().valid('monthly', 'annual').required(),
  pricingVersion: Joi.string().max(40).required(),
});
export const VerifyOnboardingSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
});
export const ResendOnboardingSchema = Joi.object({
  slug,
  email: Joi.string().trim().lowercase().email().max(100).required(),
});
@Injectable()
export class OnboardingValidationPipe implements PipeTransform {
  constructor(private readonly schema: Joi.ObjectSchema) {}
  transform(input: unknown) {
    const result = this.schema.validate(input, {
      abortEarly: false,
      convert: true,
    });
    if (result.error)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Confira os campos do cadastro.',
        fields: result.error.details.map((item) => item.path.join('.')),
      });
    return result.value;
  }
}
