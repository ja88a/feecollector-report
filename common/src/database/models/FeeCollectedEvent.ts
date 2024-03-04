import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { modelOptions } from '@typegoose/typegoose/lib/modelOptions'
import { prop } from '@typegoose/typegoose/lib/prop'

/**
 * Data structure for a parsed FeeCollectedEvent emitted by FeeCollector contracts
 * on any of their hosting blockchain
 */
@modelOptions({ schemaOptions: { collection: 'FeeCollectedEvents', versionKey: '1' } })
export class FeeCollectedEvent extends TimeStamps {
  /** Unique id of the FeeCollected event doc entry */
  @prop({ unique: true })
  id: string

  /** The blockchain unique key where the event was emitted */
  @prop()
  chainKey: string

  /** Transaction Hash, an Hexa string, in which context the event was emitted */
  @prop()
  txHash: string

  /** Address of the token that was collected, an Hexa string */
  @prop()
  token: string

  /** Address of the integrator that triggered the fee collection */
  @prop()
  integrator: string

  /** The share collected for the integrator,
   * stored in the form of a BigNumber Base10 string 
   */
  @prop()
  integratorFee: string

  /** The share collected for the integrator,
   * stored in the form of a BigNumber Base10 string 
   */
  @prop()
  lifiFee: string
}
