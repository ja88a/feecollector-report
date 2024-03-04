import { Injectable } from '@nestjs/common'
import { InjectModel } from 'kindagoose'
import { ReturnModelType } from '@typegoose/typegoose'
import { EventScrapingChainConfig } from './models/EventScrapingChainConfig'
import { FeeCollectorChainConfig } from '../config/fee-collector.config'
import { EventScrapingUtils } from './database.utils'

/**
 * Service for storing and retrieving onchain-related scraping information data about FeeCollector events
 */
@Injectable()
export class EventScrapingChainConfigPersistence {
  constructor(
    @InjectModel(EventScrapingChainConfig)
    private readonly eventScrapingInfoModel: ReturnModelType<typeof EventScrapingChainConfig>
  ) {}

  /**
   * Create a new EventScrapingInfo document in the database
   * 
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @param feeCollectorChainConfig initial configuration of the target blockchain and FeeCollector contract
   * @returns instance of the stored FeeCollector event scraping information
   */
  async createFeeCollectorEventScrapingConfig(
    chainKey: string,
    feeCollectorChainConfig: FeeCollectorChainConfig
  ) {
    const dbEntry = Object.assign(
      { id: EventScrapingUtils.computeIdEventScrapingFeeCollector(chainKey), chainKey: chainKey },
      feeCollectorChainConfig
    )
    return this.eventScrapingInfoModel.create(dbEntry)
  }

  /**
   * Get the FeeCollector events scraping information for a given chain
   * 
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @returns instance of the stored FeeCollector event scraping information
   */
  async getByChain(chainKey: string) {
    const id = EventScrapingUtils.computeIdEventScrapingFeeCollector(chainKey)
    return this.eventScrapingInfoModel.findById(id).exec()
  }
}
