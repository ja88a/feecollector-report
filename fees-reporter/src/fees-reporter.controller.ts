import { Controller, Get, Param } from '@nestjs/common'
import { FeesReporterService } from './fees-reporter.service'
import { IntegratorCollectedFeesReport } from './dto/IntegratorCollectedFees'
import { ApiParam, ApiTags } from '@nestjs/swagger/dist/decorators'
import { EProcessExitSignal, MS_CONFIG } from 'feecollector-report-common/dist/config/service.config'
import { default as Logger } from 'feecollector-report-common/dist/logger/logger'
import { exit } from 'node:process'

/**
 * REST API for reporting on fees collected by the LiFi protocol and its contracts on chains.
 */
@ApiTags('FeeCollector Reporting API')
@Controller({
  version: MS_CONFIG.VERSION_PUBLIC,
  path: 'collectedfees',
})
@Controller()
export class FeesReporterController {
  /** Logger */
  private readonly logger = Logger.child({
    label: FeesReporterController.name,
  })

  constructor(private readonly feesReporterService: FeesReporterService) {}

  /**
   * Reports the collected fees by the given integrator, broken down by tokens and corresponding chain where the FeeCollector contracts is deployed.
   * @param integratorId The account address of the integrator.
   * @returns A list of collected fees by the integrator.
   */
  @Get('/integrators/:integratorId')
  @ApiParam({
    name: 'integratorId',
    required: true,
    description: 'Account address of the integrator, a 0x hexa address on EVM chains',
    type: 'string',
  })
  reportCollectedFeesBy(
    @Param('integratorId') integratorId: string
  ): Promise<IntegratorCollectedFeesReport> {
    return this.feesReporterService.reportCollectedFees(integratorId)
  }

  // //////////////////////////////////////////////////////
  //
  // App lifecycle Management - Module Hooks
  // 

  /**
   * Default init method for the App and its services
   */
  async onModuleInit() {
    await this.feesReporterService.init().catch(async (error: Error) => {
      this.logger.error(`Application main service failed to init. Stopping it \n${error}`)
      await this.onApplicationShutdown(EProcessExitSignal.INIT_FAIL)
    })

    this.logger.info(`Application main services initialized`)
  }

  /**
   * Default graceful App shutdown method
   *
   * It is bound to the Nodejs shutdown hooks and gets triggered on any interruptions.
   *
   * @param signal Signal at the origin of this shutdown call, e.g. `SIGINT`
   * @see {@link EProcessExitSignal} for the app specific signals
   */
  async onApplicationShutdown(signal: string): Promise<void> {
    this.logger.warn(`Graceful App Shutdown on exit signal '${signal}'`)

    if (this.feesReporterService)
      await this.feesReporterService.shutdown(signal).catch((error: Error) => {
        this.logger.error(`Improper service shutdown: ${error.message}`, error)
        exit(1)
      })

    exit()
  }
}
