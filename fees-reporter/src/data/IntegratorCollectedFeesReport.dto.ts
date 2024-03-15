import {
  IsHexadecimal,
  IsNotEmpty,
  IsNumberString,
  IsString,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

/** 
 * Convert a plain JSON object to a proper IntegratorCollectedFeesReport instance
 * 
 * This conversion is required only for the validation of the IntegratorCollectedFeesReport
 */
export function createIntegratorCollectedFeesReport(
  report: IntegratorCollectedFeesReport
): IntegratorCollectedFeesReport {
  const validReport = Object.assign(new IntegratorCollectedFeesReport(), report)

  const validIntegratorCollectedFees = Array.from(report.integratorCollectedFees.values()).map(
    (value) =>
      Object.assign(new ChainTokenAmount(), {
        chainKey: value.chainKey,
        token: value.token,
        amount: value.amount.toString(),
      })
  )
  validReport.integratorCollectedFees = validIntegratorCollectedFees

  // report.lifiCollectedFees = Object.assign(new Array<ChainTokenAmount>(), report.lifiCollectedFees)
  const validLifiCollectedFees = Array.from(report.lifiCollectedFees.values()).map((value) =>
    Object.assign(new ChainTokenAmount(), {
      chainKey: value.chainKey,
      token: value.token,
      amount: value.amount.toString(),
    })
  )
  validReport.lifiCollectedFees = validLifiCollectedFees

  return validReport
}

/**
 * Report the collected fees by an integrator,
 * grouped by chain and their tokens.
 *
 * Corresponding LiFi shared fees are reported.
 */
export class IntegratorCollectedFeesReport {
  /** Address of the integrator */
  // @IsEthereumAddress()
  @IsNotEmpty()
  integrator: string

  /** Fees collected by the integrator */
  // @IsArray()
  @ValidateNested()
  @Type(() => ChainTokenAmount)
  integratorCollectedFees: ChainTokenAmount[]

  /** Share of the fees collected by LiFi */
  // @IsArray()
  @ValidateNested()
  @Type(() => ChainTokenAmount)
  lifiCollectedFees: ChainTokenAmount[]
}

/**
 * Total amount of fees per the chain and token asset
 *
 * The token symbol and decimals are to be retrieved from the chain.
 */
export class ChainTokenAmount {
  /** Unique blockchain key, refer to LiFi data types */
  @IsString()
  @IsNotEmpty()
  chainKey: string

  /** The token address on the specified chain */
  @IsHexadecimal()
  @IsNotEmpty()
  token: string

  /** Total cumulated amount of the collected fees. A string representation of corresponding BigNumber available on chain */
  @IsNumberString()
  @IsNotEmpty()
  amount: string
}
