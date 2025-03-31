import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';

@Injectable()
export class HttpServiceWrapper {
  private readonly logger = new Logger(HttpServiceWrapper.name);
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL') || '';
    if (!this.apiUrl) {
      throw new Error('API_URL is not defined in the environment variables');
    }
  }

  private getAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async get<T>(endpoint: string, params?: any, token?: string): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const headers = token ? this.getAuthHeaders(token) : {};
    this.logger.log(`GET Request to URL: ${url} with headers: ${JSON.stringify(headers)}`);
    try {
      const response = await this.httpService.get<T>(url, { params, headers }).toPromise();
      if (!response) {
        throw new Error('No response received from the API');
      }
      return response.data;
    } catch (error) {
      this.handleHttpError(error);
    }
  }

  async post<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const headers = token ? this.getAuthHeaders(token) : {};
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
    const headers = token ? this.getAuthHeaders(token) : {};
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
    const headers = token ? this.getAuthHeaders(token) : {};
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
