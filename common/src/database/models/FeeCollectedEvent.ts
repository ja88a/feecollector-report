import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { modelOptions } from '@typegoose/typegoose/lib/modelOptions'
import { prop } from '@typegoose/typegoose/lib/prop'

/**
 * Data structure for a parsed FeeCollectedEvent emitted by FeeCollector contracts
 * on any of their hosting blockchain
 */
@modelOptions({
  schemaOptions: { collection: 'FeeCollectedEvents' },
  options: { disableCaching: false },
})
export class FeeCollectedEvent extends TimeStamps {
  /** The blockchain unique key where the event was emitted */
  @prop()
  chainKey: string

  /** Transaction Hash, an Hexa string, in which context the event was emitted */
  @prop({ unique: true })
  txHash: string

  /** The block tag when the event was triggered */
  @prop()
  blockTag: number | string

  /** Address of the token that was collected, an Hexa string */
  @prop()
  token: string

  /** Address of the integrator that triggered the fee collection */
  @prop({ index: true })
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
