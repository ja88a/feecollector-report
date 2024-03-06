import { Controller, Get, Param } from '@nestjs/common'
import { FeesReporterService } from './fees-reporter.service'
import { IntegratorCollectedFeesReport } from './dto/IntegratorCollectedFees';

@Controller()
export class FeesReporterController {
  constructor(private readonly feesReporterService: FeesReporterService) {}

  @Get('collectedfees/integrators/:integratorId')
  reportCollectedFeesBy(@Param('integratorId') integratorId: string,): Promise<IntegratorCollectedFeesReport> {
    return this.feesReporterService.reportCollectedFees(integratorId);
  }
}
