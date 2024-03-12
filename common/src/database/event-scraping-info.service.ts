import { Injectable } from '@nestjs/common'
import { InjectModel } from 'kindagoose'
import { ReturnModelType } from '@typegoose/typegoose'
import { EventScrapingChainConfig } from './models/EventScrapingChainConfig'
import { FeeCollectorChainConfig } from '../config/fee-collector.config'
import { Logger } from '../logger/logger'

/**
 * Service for storing and retrieving onchain-related scraping information data about FeeCollector events
 */
@Injectable()
export class EventScrapingChainConfigPersistence {
  private readonly logger = Logger.child({
    label: EventScrapingChainConfigPersistence.name,
  })

  constructor(
    @InjectModel(EventScrapingChainConfig)
    private readonly eventScrapingInfoModel: ReturnModelType<typeof EventScrapingChainConfig>
  ) {}

  /**
   * Create a new EventScrapingInfo document in the database
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @param feeCollectorChainConfig initial configuration of the target blockchain and FeeCollector contract
   * @returns instance of the stored FeeCollector event scraping information
   */
  async createFeeCollectorEventScrapingConfig(
    chainKey: string,
    feeCollectorChainConfig: FeeCollectorChainConfig
  ): Promise<FeeCollectorChainConfig> {
    const config = Object.assign({ chainKey: chainKey }, feeCollectorChainConfig)
    this.logger.debug(
      `Creating FeeCollector event scraping config DB entry: ${JSON.stringify(config)}`
    )
    const doc = await this.eventScrapingInfoModel.create(config)
    return this.convertFromDoc(doc)
  }

  /**
   * Get the FeeCollector events scraping information for a given chain
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @returns instance of the stored FeeCollector event onchain scraping information
   */
  async getByChain(chainKey: string): Promise<FeeCollectorChainConfig | undefined> {
    const doc = await this.eventScrapingInfoModel.findOne({ chainKey: chainKey }).exec()
    return doc ? this.convertFromDoc(doc) : undefined
  }

  /**
   * Update the last scanned block number of an FeeCollector event scraping configuration
   * @param id document ID of the
   * @param lastScannedBlock the last scanned block number
   * @returns the updated FeeCollector event scraping information
   */
  async updateFeeCollectorLastScannedBlock(
    id: string,
    lastScannedBlock: number
  ): Promise<FeeCollectorChainConfig> {
    const doc = await this.eventScrapingInfoModel
      .findByIdAndUpdate(id, { feeCollectorBlockLastScanned: lastScannedBlock })
      .exec()
    return this.convertFromDoc(doc)
  }

  /**
   * Retrieve the FeeCollector events scraping information for a given blockchain
   * plus update it to reflect that a scraping session is initiated / in progress
   */

  /**
   * Convert a database document to a FeeCollectorChainConfig object.
   * @param doc the database document
   * @returns the FeeCollectorChainConfig object
   */
  private convertFromDoc(doc): FeeCollectorChainConfig {
    return {
      docId: doc.id,
      chainKey: doc.chainKey,
      chainId: doc.chainId,
      chainType: doc.chainType,
      rpcUrl: doc.rpcUrl,
      feeCollectorContract: doc.feeCollectorContract,
      feeCollectorBlockStart: doc.feeCollectorBlockStart,
      feeCollectorBlockLastScanned: doc.feeCollectorBlockLastScanned,
    }
  }
}
