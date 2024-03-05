import { Controller, Get } from '@nestjs/common'
import { FeesReporterService } from './fees-reporter.service'

@Controller()
export class FeesReporterController {
  constructor(private readonly feesReporterService: FeesReporterService) {}

  @Get()
  getHello(): string {
    return this.feesReporterService.getHello()
  }
}
