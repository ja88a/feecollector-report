import { Injectable } from '@nestjs/common'
import { InjectModel } from 'kindagoose'
import { ReturnModelType } from '@typegoose/typegoose'
import { FeeCollectedEvent } from './models/FeeCollectedEvent'
import { FeeCollectedEventParsed } from '../data/FeeCollectedEventParsed'
import { Logger } from '../logger/logger'
import { BigNumber } from 'ethers/lib/ethers'

/**
 * Service for storing and retrieving FeeCollected events emitted by the FeeCollector contract to/from the database
 */
@Injectable()
export class FeeCollectedEventPersistence {
  private readonly logger = Logger.child({
    label: FeeCollectedEventPersistence.name,
  })

  constructor(
    @InjectModel(FeeCollectedEvent)
    private readonly feeCollectedEventModel: ReturnModelType<typeof FeeCollectedEvent>
  ) {}

  /**
   * Create a new FeeCollectedEvent document in the database
   *
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvent a FeeCollector.FeeCollected event to persist
   * @returns instance of the stored FeeCollected event
   */
  async createFeeCollectedEvent(feeCollectedEvent: FeeCollectedEventParsed) {
    const doc = this.convertToDoc(feeCollectedEvent)
    return await this.feeCollectedEventModel.create(doc)
  }

  /**
   * Store a set of FeeCollectedEvent documents in the database for a given blockchain
   * @param chainKey the unique Lifi key of the blockchain hosting the FeeCollector contract
   * @param feeCollectedEvents a list of FeeCollector.FeeCollected contract events to persist
   * @returns instances of the stored FeeCollected events
   */
  async storeFeeCollectedEvents(feeCollectedEvents: FeeCollectedEventParsed[]) {
    const dbEntries = feeCollectedEvents.map((feeCollectedEvent) => {
      return this.convertToDoc(feeCollectedEvent)
    })
    return await this.feeCollectedEventModel
      .insertMany(dbEntries, { ordered: false })
      .catch((err) => {
        this.logger.warn(`Attempted to insert already stored events`, err)
      })
  }

  /**
   * Retrieve the FeeCollected events for a given integrator
   * @param integratorId Unique ID, hex address, of the integrator
   * @returns the list of FeeCollected events stored in the database for the given integrator
   */
  async retrieveFeeCollectedEventsByIntegrator(integratorId: string): Promise<FeeCollectedEventParsed[]> {
    const feeCollectedEvents = await this.feeCollectedEventModel.find({ integrator: integratorId })
    return feeCollectedEvents.map((feeCollectedEvent) => {
      return this.convertFromDoc(feeCollectedEvent)
    })
  }

  /** Mapping utilty method: Convert an external data model to a doc entry */
  private convertToDoc(feeCollectedEvent: FeeCollectedEventParsed): FeeCollectedEvent {
    return {
      chainKey: feeCollectedEvent.chainKey,
      txHash: feeCollectedEvent.txHash,
      blockTag: feeCollectedEvent.blockTag,
      token: feeCollectedEvent.token,
      integrator: feeCollectedEvent.integrator,
      integratorFee: feeCollectedEvent.integratorFee.toHexString(),
      lifiFee: feeCollectedEvent.lifiFee.toHexString(),
    }
  }

  /** Mapping utilty method: Convert a stored doc into an external data model instance */
  private convertFromDoc(doc): FeeCollectedEventParsed {
    return {
      docId: doc.id,
      chainKey: doc.chainKey,
      txHash: doc.txHash,
      blockTag: doc.blockTag,
      token: doc.token,
      integrator: doc.integrator,
      integratorFee: BigNumber.from(doc.integratorFee),
      lifiFee: BigNumber.from(doc.lifiFee),
    }
  }
}
