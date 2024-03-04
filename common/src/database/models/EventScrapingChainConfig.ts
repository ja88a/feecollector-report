import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { modelOptions } from '@typegoose/typegoose/lib/modelOptions'
import { prop } from '@typegoose/typegoose/lib/prop'

/**
 * Schema of the FeeCollector chain configuration document
 */
@modelOptions({ schemaOptions: { collection: 'EventScrapingChainConfigs' } })
export class EventScrapingChainConfig extends TimeStamps {
  /** Unique id of the EventScrapingChainConfig doc entry */
  @prop({ unique: true })
  id: string

  /** the target blockchain key, based on Lifi data types */
  @prop()
  chainKey: string

  /** the target blockchain ID, based on Lifi data types */
  @prop()
  chainId: number

  /** the chain type, e.g. EVM, based on Lifi data types */
  @prop()
  chainType: string

  /** the URL of the JSON RPC provider */
  @prop()
  rpcUrl: string

  /** the address of the Lifi FeeCollector contract */
  @prop()
  feeCollectorContract: string

  /** the block number from which to start seeking for FeeCollected events */
  @prop()
  feeCollectorBlockStart: number

  /** the number of last scanned block while seeking for onchain events */
  @prop()
  feeCollectorBlockLastScanned?: number
}