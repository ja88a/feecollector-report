import { Injectable } from '@nestjs/common'
import { InjectModel } from 'kindagoose'
import { ReturnModelType } from '@typegoose/typegoose'
import { EventScrapingChainConfig } from './models/EventScrapingChainConfig'
import { Logger } from '../logger/logger'
import { BeAnObject } from '@typegoose/typegoose/lib/types'
import { ChainKey, ChainType } from '@lifi/types'
import { Document, Types } from 'mongoose'
import { EEventScrapingStatus, FeeCollectorChainConfig } from '../data/FeeCollectorChainConfig'

/**
 * Service for storing and retrieving onchain-related scraping information data about FeeCollector events
 */
@Injectable()
export class EventScrapingChainConfigPersistence {
  /** Private logger */
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
    this.logger.info(
      `Creating a new FeeCollector scraping config for chain '${chainKey}' in DB: ${JSON.stringify(config)}`
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
    if (doc === null) {
      this.logger.warn(`No event scraping configuration available in DB for chain ${chainKey}`)
    }
    return doc ? this.convertFromDoc(doc) : undefined
  }

  /**
   * Update the last scanned block number of a FeeCollector chain scraping configuration
   * @param id document ID of the feecollector chain configuration to update
   * @param lastScannedBlock the last scanned block number
   * @returns the updated FeeCollector event scraping information
   */
  async updateFeeCollectorLastScanInfo(
    config: FeeCollectorChainConfig,
    lastScannedBlock: number
  ): Promise<FeeCollectorChainConfig> {
    config.feeCollector.lastScanBlock = lastScannedBlock
    config.feeCollector.lastScanTime = Date.now()
    const doc = await this.eventScrapingInfoModel
      .findByIdAndUpdate(
        config.docId,
        { feeCollector: config.feeCollector },
        { new: false }
      )
      .exec()
    if (doc === null) {
      throw new Error(
        `No FeeCollector event scraping configuration ${config.docId} found to report last scan info - block: ${lastScannedBlock}`
      )
    }
    return this.convertFromDoc(doc)
  }

  /**
   * Convert a database document to a FeeCollectorChainConfig object.
   * @param doc the database document
   * @returns the FeeCollector Chain configuration
   */
  private convertFromDoc(
    doc: Document<unknown, BeAnObject, EventScrapingChainConfig> &
      Omit<EventScrapingChainConfig & { _id: Types.ObjectId }, ''>
  ): FeeCollectorChainConfig {
    return {
      docId: doc.id,
      version: doc.version,
      chainKey: <ChainKey>doc.chainKey,
      status: <EEventScrapingStatus>doc.status,
      chain: {
        id: doc.chain.id,
        type: <ChainType>doc.chain.type,
        rpcUrl: doc.chain.rpcUrl,
        latestBlockTag: doc.chain.lastBlockTag,
      },
      feeCollector: {
        contract: doc.feeCollector.contract,
        blockStart: doc.feeCollector.blockStart,
        lastScanBlock: doc.feeCollector.lastScanBlock,
        lastScanTime: doc.feeCollector.lastScanTime,
      },
    }
  }
}
