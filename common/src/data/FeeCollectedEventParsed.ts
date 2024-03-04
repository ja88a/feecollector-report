import { BigNumber } from 'ethers'

/**
 * Data structure for a parsed FeeCollectedEvent emitted by FeeCollector contracts
 * on any of their hosting blockchain
 */
export interface ParsedFeeCollectedEvents {
  /** Unique blockchain key from which the event come from */
  chainKey: string

  /** Transaction hash in which context the event was emitted */
  txHash: string

  /** Address of the token that was collected */
  token: string

  /** Address of the integrator that triggered the fee collection */
  integrator: string

  /** the share collected for the integrator */
  integratorFee: BigNumber

  /** the share collected for lifi */
  lifiFee: BigNumber
}