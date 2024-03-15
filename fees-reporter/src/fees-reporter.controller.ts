import { Controller, Get, HttpException, HttpStatus, Param } from '@nestjs/common'
import { FeesReporterService } from './fees-reporter.service'
import {
  IntegratorCollectedFeesReport,
  createIntegratorCollectedFeesReport,
} from './data/IntegratorCollectedFeesReport.dto'
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger/dist/decorators'
import { EProcessExitSignal, MS_CONFIG } from 'feecollector-report-common/config'
import { Logger } from 'feecollector-report-common/logger'
import { exit } from 'node:process'
import { validateAccountId, validateReport } from './utils/CollectedFeesValidator'
import { VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS } from './config/service.config'

/**
 * REST API for reporting on fees collected by the LiFi protocol and its contracts on chains.
 */
@ApiTags('Collected Fees Reporting API')
@Controller({
  version: MS_CONFIG.VERSION_PUBLIC,
  path: 'collectedfees',
})
export class FeesReporterController {
  /** Logger */
  private readonly logger = Logger.child({
    label: FeesReporterController.name,
  })

  constructor(private readonly feesReporterService: FeesReporterService) {}

  /**
   * Reports all the fees collected by the specified integrator, along with the LiFi protocol share.
   *
   * The total amount of collected fees is grouped by tokens and corresponding chain where the FeeCollector contract(s) is deployed.
   *
   * @param integratorId The account address of the integrator.
   * @returns A list of collected fees by the integrator.
   */
  @Get('/integrators/:integratorId')
  @ApiParam({
    name: 'integratorId',
    required: true,
    description: 'Account address of the integrator, the 0x hexa address on EVM chains',
    type: 'string',
    example: '0xD5e230cEa6dA2F0C62bdeED2Cf85326F1063e27D',
  })
  @ApiOkResponse({
    status: HttpStatus.OK,
    description:
      'The list of fees collected by the given integrator, grouped by tokens and their underlying blockchain.',
    type: require('./data/IntegratorCollectedFeesReport.dto').IntegratorCollectedFeesReport,
  })
  @ApiInternalServerErrorResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error.',
    type: require('./data/HttpResponse.dto').HttpResponseInternalServerError,
  })
  @ApiBadRequestResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
    type: require('./data/HttpResponse.dto').HttpResponseBadRequest,
  })
  async reportCollectedFeesBy(
    @Param('integratorId') integratorId: string
  ): Promise<IntegratorCollectedFeesReport> {
    this.logger.info(`CollectedFees report requested for integrator '${integratorId}'`)

    // Validate the input parameters
    const validationErrors = validateAccountId(integratorId)
    if (validationErrors.length > 0) {
      this.logger.warn(
        `Unsupported integrator ID '${integratorId}' requested \n${JSON.stringify(validationErrors)}`
      )
      throw new HttpException('Unsupported integrator ID', HttpStatus.BAD_REQUEST)
    }

    // Generate the report
    const report = await this.feesReporterService
      .reportCollectedFees(integratorId)
      .catch((error) => {
        this.logger.error(
          `Failed to generate a collected fee report for integrator '${integratorId}'`,
          error.stack
        )
        throw new HttpException(
          'Internal Server Error. Reporting failed',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      })

    // Validate the report output
    if (VALIDATE_OUTPUT_COLLECTED_FEES_REPORTS) {
      const reportInst = createIntegratorCollectedFeesReport(report)
      await validateReport(reportInst).then((validationErrors) => {
        if (validationErrors.length > 0) {
          this.logger.error(
            `Failed to generate a valid collected fee report for integrator '${integratorId}'`,
            validationErrors
          )
          throw new HttpException(
            'Internal Server Error. Invalid report generated.',
            HttpStatus.INTERNAL_SERVER_ERROR
          )
        }
        return report
      })
    }

    return report
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
