import { CreateOrganizationSchema } from './create-organization.dto';

describe('CreateOrganizationSchema', () => {
  it('normalizes custom slug before forwarding payload', () => {
    const { value, error } = CreateOrganizationSchema.validate({
      name: 'Condominio Norte',
      slug: ' CháCara -- Sacopã ',
    });

    expect(error).toBeUndefined();
    expect(value.slug).toBe('chacara-sacopa');
  });

  it('rejects slug input that normalizes to empty', () => {
    const { error } = CreateOrganizationSchema.validate({
      name: 'Condominio Norte',
      slug: '---',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('slug must contain at least one alphanumeric character');
  });
});
