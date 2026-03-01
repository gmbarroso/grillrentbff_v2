import * as Joi from 'joi';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  organizationSlug!: string;
  name!: string;
  email!: string;
  password!: string;
  apartment!: string;
  block!: number;
  role!: UserRole;
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
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  apartment: Joi.string().required(),
  block: Joi.number().valid(1, 2).required(),
  role: Joi.string().valid(UserRole.ADMIN, UserRole.RESIDENT).default(UserRole.RESIDENT),
});
