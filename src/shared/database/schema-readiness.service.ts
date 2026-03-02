import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class SchemaReadinessService implements OnModuleInit {
  private readonly logger = new Logger(SchemaReadinessService.name);
  private static readonly LOCAL_LIKE_ENVS = new Set(['local', 'development', 'dev', 'test']);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const nodeEnv = (this.configService.get<string>('NODE_ENV') || '').trim().toLowerCase();
    if (SchemaReadinessService.LOCAL_LIKE_ENVS.has(nodeEnv)) {
      return;
    }

    const hasOrganizationColumn = await this.checkColumnExists('revoked_token', 'organizationId');
    if (!hasOrganizationColumn) {
      throw new Error(
        'DB schema is missing revoked_token.organizationId. Apply organization multitenancy migration before starting the BFF.',
      );
    }

    this.logger.log('Schema readiness check passed for revoked_token.organizationId');
  }

  private async checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = $1
            AND column_name = $2
            AND table_schema = current_schema()
        ) AS "exists"
      `,
      [tableName, columnName],
    );
    return result?.[0]?.exists === true;
  }
}
