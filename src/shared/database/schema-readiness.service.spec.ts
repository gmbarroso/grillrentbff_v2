import { SchemaReadinessService } from './schema-readiness.service';

describe('SchemaReadinessService', () => {
  it('skips schema check in local-like envs', async () => {
    const dataSource = { query: jest.fn() };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    };

    const service = new SchemaReadinessService(dataSource as any, configService as any);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('throws in production when required organization columns are missing', async () => {
    const dataSource = {
      query: jest.fn(async (query: string, params: string[]) => {
        const [tableName] = params;
        if (tableName === 'revoked_token') {
          return [{ exists: false }];
        }
        return [{ exists: true }];
      }),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    };

    const service = new SchemaReadinessService(dataSource as any, configService as any);
    await expect(service.onModuleInit()).rejects.toThrow(
      'DB schema is missing required organization columns: revoked_token.organizationId. Apply organization multitenancy migration before starting the BFF.',
    );
  });

  it('passes in production when required organization columns exist', async () => {
    const dataSource = {
      query: jest.fn(async () => [{ exists: true }]),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    };

    const service = new SchemaReadinessService(dataSource as any, configService as any);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(dataSource.query).toHaveBeenCalledTimes(2);
  });

  it('throws in production when user.organizationId is missing', async () => {
    const dataSource = {
      query: jest.fn(async (query: string, params: string[]) => {
        const [tableName] = params;
        if (tableName === 'user') {
          return [{ exists: false }];
        }
        return [{ exists: true }];
      }),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    };

    const service = new SchemaReadinessService(dataSource as any, configService as any);
    await expect(service.onModuleInit()).rejects.toThrow(
      'DB schema is missing required organization columns: user.organizationId. Apply organization multitenancy migration before starting the BFF.',
    );
  });
});
