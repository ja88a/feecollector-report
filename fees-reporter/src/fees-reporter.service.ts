import { Injectable } from '@nestjs/common'
import {
  ChainTokenAmount,
  IntegratorCollectedFeesReport,
  createIntegratorCollectedFeesReport,
} from './data/IntegratorCollectedFeesReport.dto'
import { Logger } from 'feecollector-report-common/logger'
import { StoreFeeCollectedEvent } from 'feecollector-report-common/database'
import { ChainTokenFeesBN } from './data/ChainTokenFeesBN'

/**
 * Collected Fees reporting service
 */
@Injectable()
export class FeesReporterService {
  /** Logger */
  private readonly logger = Logger.child({
    label: FeesReporterService.name,
  })

  constructor(
    //  private readonly eventScrapingChainConfigPersistence: EventScrapingChainConfigPersistence,
    private readonly feeCollectedEventPersistence: StoreFeeCollectedEvent
  ) {}

  async init(): Promise<void> {
    this.logger.debug(`Initializing FeesReporterService`)
  }

  async shutdown(signal: string): Promise<void> {
    this.logger.info(`Shutting down the Service on signal ${signal}`)
  }

  /**
   * Retrieve the FeeCollected events for a given integrator
   * from the persistence layer and summarise them in a report
   * @param integratorId
   * @returns A report of the collected fees by the integrator
   */
  async reportCollectedFees(integratorId: string): Promise<IntegratorCollectedFeesReport> {
    const integratorFeeCollectedEvents =
      await this.feeCollectedEventPersistence.retrieveFeeCollectedEventsByIntegrator(integratorId)

    // Sum up the collected fees for each chain token
    const collectedFeesIntegrator = new Map<string, ChainTokenFeesBN>()
    const collectedFeesLifi = new Map<string, ChainTokenFeesBN>()

    for (let i = 0; i < integratorFeeCollectedEvents.length; i++) {
      const event = integratorFeeCollectedEvents[i]
      const entryKey = `${event.chainKey}-${event.token}`

      const integratorFeesForToken = collectedFeesIntegrator.get(entryKey)
      if (!integratorFeesForToken) {
        collectedFeesIntegrator.set(entryKey, {
          chainKey: event.chainKey,
          token: event.token,
          amount: event.integratorFee,
        })
      } else {
        integratorFeesForToken.amount.add(event.integratorFee)
      }

      const lifiFeesForToken = collectedFeesLifi.get(entryKey)
      if (!lifiFeesForToken) {
        collectedFeesLifi.set(entryKey, {
          chainKey: event.chainKey,
          token: event.token,
          amount: event.lifiFee,
        })
      } else {
        lifiFeesForToken.amount.add(event.lifiFee)
      }
    }

    return {
      integrator: integratorId,
      integratorCollectedFees: Array.from(collectedFeesIntegrator.values()).map((value) => ({
        chainKey: value.chainKey,
        token: value.token,
        amount: value.amount.toString(),
      })),
      lifiCollectedFees: Array.from(collectedFeesLifi.values()).map((value) => ({
        chainKey: value.chainKey,
        token: value.token,
        amount: value.amount.toString(),
      })),
    }
  }
}
