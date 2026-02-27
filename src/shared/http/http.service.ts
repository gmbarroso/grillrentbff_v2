import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../request-context/request-context.service';

@Injectable()
export class HttpServiceWrapper {
  private readonly logger = new Logger(HttpServiceWrapper.name);
  private readonly apiUrl: string;
  private readonly internalServiceToken?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly requestContextService: RequestContextService,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL') || '';
    this.internalServiceToken = this.configService.get<string>('INTERNAL_SERVICE_TOKEN') || undefined;

    if (!this.apiUrl) {
      throw new Error('API_URL is not defined in the environment variables');
    }

    const nodeEnv = (this.configService.get<string>('NODE_ENV') || '').toLowerCase();
    const requiresInternalToken = nodeEnv === 'production' || nodeEnv === 'staging';
    if (requiresInternalToken && !this.internalServiceToken) {
      throw new Error('INTERNAL_SERVICE_TOKEN is required outside local/test environments');
    }
  }

  private getHeaders(token?: string) {
    const requestId = this.requestContextService.getRequestId() || randomUUID();
    const headers: Record<string, string> = {
      'x-request-id': requestId,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (this.internalServiceToken) {
      headers['x-internal-service-token'] = this.internalServiceToken;
    }

    return headers;
  }

  async get<T>(endpoint: string, params?: any, token?: string): Promise<T> {
    this.logger.log('Entering HttpServiceWrapper.get');
    this.logger.log(`Endpoint: ${endpoint}`);
    this.logger.log(`Params: ${JSON.stringify(params)}`);

    const url = `${this.apiUrl}/${endpoint}`;
    const headers = this.getHeaders(token);
    this.logger.log(`GET Request to URL: ${url}`);
    try {
      const response = await this.httpService.get<T>(url, { params, headers }).toPromise();
      if (!response) {
        throw new Error('No response received from the API');
      }
      return response.data;
    } catch (error) {
      this.logger.error(`Error in HttpServiceWrapper.get: ${error.message}`);
      this.handleHttpError(error);
    }
  }

  async post<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const headers = this.getHeaders(token);
    try {
      const response = await this.httpService.post<T>(url, data, { headers }).toPromise();
      if (!response) {
        throw new Error('No response received from the API');
      }
      return response.data;
    } catch (error) {
      this.handleHttpError(error);
    }
  }

  async put<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const headers = this.getHeaders(token);
    try {
      const response = await this.httpService.put<T>(url, data, { headers }).toPromise();
      if (!response) {
        throw new Error('No response received from the API');
      }
      return response.data;
    } catch (error) {
      this.handleHttpError(error);
    }
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const headers = this.getHeaders(token);
    try {
      const response = await this.httpService.delete<T>(url, { headers }).toPromise();
      if (!response) {
        throw new Error('No response received from the API');
      }
      return response.data;
    } catch (error) {
      this.handleHttpError(error);
    }
  }

  private handleHttpError(error: any): never {
    if (error.response) {
      const { status, data } = error.response;
      this.logger.error(`API Error: ${status} - ${JSON.stringify(data)}`);
      throw new HttpException(data.message || 'API Error', status);
    } else {
      this.logger.error(`Unexpected Error: ${error.message}`);
      throw new HttpException('Unexpected Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
