import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HttpServiceWrapper } from './http.service';
import { RequestContextModule } from '../request-context/request-context.module';

@Module({
  imports: [HttpModule, ConfigModule, RequestContextModule],
  providers: [HttpServiceWrapper],
  exports: [HttpServiceWrapper],
})
export class HttpServiceModule {}
