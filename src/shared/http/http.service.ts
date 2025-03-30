import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HttpServiceWrapper {
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

  async get<T>(endpoint: string, params?: any): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const response = await this.httpService.get(url, { params }).toPromise();
    return response.data;
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const response = await this.httpService.post(url, data).toPromise();
    return response.data;
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const response = await this.httpService.put(url, data).toPromise();
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;
    const response = await this.httpService.delete(url).toPromise();
    return response.data;
  }
}
