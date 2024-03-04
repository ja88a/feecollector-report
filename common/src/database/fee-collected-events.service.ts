import { Injectable } from '@nestjs/common'
import { InjectModel } from 'kindagoose'
import { ReturnModelType } from '@typegoose/typegoose'
import { FeeCollectedEvent } from './models/FeeCollectedEvent'
import { FeeCollectedEventUtils } from './database.utils'
import { ParsedFeeCollectedEvents } from '../data/FeeCollectedEventParsed'

/**
 * Service for storing and retrieving FeeCollected events emitted by the FeeCollector contract to/from the database
 */
@Injectable()
export class FeeCollectedEventPersistence {
  constructor(
    @InjectModel(FeeCollectedEvent)
    private readonly eventScrapingInfoModel: ReturnModelType<typeof FeeCollectedEvent>
  ) {}

  /**
   * Create a new FeeCollectedEvent document in the database
   * 
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvent a FeeCollector.FeeCollected event to persist
   * @returns instance of the stored FeeCollected event
   */
  async createFeeCollectedEvent(
    chainKey: string,
    feeCollectedEvent: ParsedFeeCollectedEvents
  ) {
    const dbEntry = Object.assign(
      { id: FeeCollectedEventUtils.computeIdEventFeeCollected(chainKey, feeCollectedEvent.txHash) },
      feeCollectedEvent
    )
    return this.eventScrapingInfoModel.create(dbEntry)
  }

  /**
   * Store a set of FeeCollectedEvent documents in the database for a given blockchain
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvents a list of FeeCollector.FeeCollected contract events to persist
   * @returns instances of the stored FeeCollected events
   */
  async storeFeeCollectedEvents(
    chainKey: string,
    feeCollectedEvents: ParsedFeeCollectedEvents[]
  ) {
    const dbEntries = feeCollectedEvents.map((feeCollectedEvent) => {
      return Object.assign(
        { id: FeeCollectedEventUtils.computeIdEventFeeCollected(chainKey, feeCollectedEvent.txHash) },
        feeCollectedEvent
      )
    });
    return this.eventScrapingInfoModel.insertMany(dbEntries)
  }
}
