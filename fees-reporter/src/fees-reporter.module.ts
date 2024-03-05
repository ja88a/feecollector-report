import { Module } from '@nestjs/common'
import { FeesReporterController } from './fees-reporter.controller'
import { FeesReporterService } from './fees-reporter.service'

@Module({
  imports: [],
  controllers: [FeesReporterController],
  providers: [FeesReporterService],
})
export class FeesReporterModule {}
