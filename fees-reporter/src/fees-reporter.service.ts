import { Injectable } from '@nestjs/common'
import {
  EventScrapingChainConfigPersistence,
  FeeCollectedEventPersistence,
} from 'feecollector-report-common'
import { ChainTokenAmount, IntegratorCollectedFeesReport } from './dto/IntegratorCollectedFees'
import { BigNumber } from 'ethers/lib/ethers'

interface ChainTokenFeesBN {
  chainKey: string

  token: string

  amount: BigNumber
}

@Injectable()
export class FeesReporterService {
  constructor(
    private readonly eventScrapingChainConfigPersistence: EventScrapingChainConfigPersistence,
    private readonly feeCollectedEventPersistence: FeeCollectedEventPersistence
  ) {}

  /**
   * Retreieve the FeeCollected events for a given integrator
   * from the persistence layer and summarise them in a report
   * @param integratorId
   */
  async reportCollectedFees(integratorId: string): Promise<IntegratorCollectedFeesReport> {
    const integratorFeeCollectedEvents =
      await this.feeCollectedEventPersistence.retrieveFeeCollectedEventsByIntegrator(integratorId)

    // Sum ip the collected fees for each chain token
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

    // Convert the collected fees into a report
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
