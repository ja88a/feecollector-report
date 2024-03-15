import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { Severity } from '@typegoose/typegoose/lib/internal/constants'
import { modelOptions } from '@typegoose/typegoose/lib/modelOptions'
import { prop } from '@typegoose/typegoose/lib/prop'

/**
 * Configuration settings for the target blockchain to scan
 */
class ChainProperties {
  /** the target blockchain ID, based on Lifi data types */
  @prop()
  id: number

  /** the chain type, e.g. `EVM`, based on Lifi data types */
  @prop()
  type: string

  /** the URL of the JSON RPC provider */
  @prop()
  rpcUrl: string

  /** the chain specific tag enabling to get its last block number */
  @prop()
  lastBlockTag: string | number
}

/**
 * LiFi FeeCollector contract properties for its onchain scanning.
 */
class FeeCollectorProperties {
  /** the address of the Lifi FeeCollector contract */
  @prop()
  contract: string

  /** the block number from which to start seeking for FeeCollected events */
  @prop()
  blockStart: number

  /** the number of last scanned block while seeking for onchain events */
  @prop()
  lastScanBlock?: number

  /** Last time a scan of block events was performed, epoch in ms */
  @prop()
  lastScanTime?: number
}

/**
 * Schema of the FeeCollector's blockchain configuration document
 */
@modelOptions({
  schemaOptions: { collection: 'EventScrapingChainConfigs', versionKey: 'version',  },
  options: { disableCaching: false, allowMixed: Severity.ALLOW },
})
export class EventScrapingChainConfig extends TimeStamps {
  /** Model version number */
  @prop({ required: true })
  version: number
  
  /** the target blockchain key, based on Lifi data types */
  @prop({ unique: true, index: true })
  chainKey: string

  /** the blockchain info */
  @prop()
  chain: ChainProperties

  /** the FeeCollector contract info */
  @prop()
  feeCollector: FeeCollectorProperties

  /** General status for scraping events on the chain */
  @prop()
  status: string
}
