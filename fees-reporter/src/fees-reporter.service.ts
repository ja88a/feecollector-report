import { Injectable } from '@nestjs/common'

@Injectable()
export class FeesReporterService {
  getHello(): string {
    return 'Hello World!'
  }
}
