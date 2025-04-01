import { Injectable, Logger } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';

@Injectable()
export class NoticeService {
  private readonly logger = new Logger(NoticeService.name);
  private readonly apiUrl = 'notices';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createNotice(body: any, token: string) {
    this.logger.log('Calling createNotice');
    this.logger.debug(`Body: ${JSON.stringify(body)}`);
    return this.httpService.post(this.apiUrl, body, token);
  }

  async getAllNotices(token: string) {
    this.logger.log('Calling getAllNotices');
    return this.httpService.get(this.apiUrl, undefined, token);
  }

  async updateNotice(id: string, body: any, token: string) {
    this.logger.log(`Calling updateNotice with ID: ${id}`);
    this.logger.debug(`Body: ${JSON.stringify(body)}`);
    return this.httpService.put(`${this.apiUrl}/${id}`, body, token);
  }

  async deleteNotice(id: string, token: string) {
    this.logger.log(`Calling deleteNotice with ID: ${id}`);
    return this.httpService.delete(`${this.apiUrl}/${id}`, token);
  }
}
