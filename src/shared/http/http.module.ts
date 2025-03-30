import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HttpServiceWrapper } from './http.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [HttpServiceWrapper],
  exports: [HttpServiceWrapper],
})
export class HttpServiceModule {}
