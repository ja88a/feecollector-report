import {
  ValidationError, isAlphanumeric,
  isEthereumAddress,
  isHexadecimal,
  validate
} from 'class-validator'
import { VALID_OPT } from 'feecollector-report-common/config'
import { Logger } from 'feecollector-report-common/logger'
import { IntegratorCollectedFeesReport } from '../data/IntegratorCollectedFeesReport.dto'

/** Logger */
const logger = Logger.child({
  label: 'CollectedFeesValidator',
})

/**
 * Validate a account update event and provide fields & values validation errors if any
 * @param report the account update event to validate
 * @return List of validation errors, if any. Else an empty array.
 */
export async function validateReport(
  report: IntegratorCollectedFeesReport
): Promise<ValidationError[]> {
  const validationErr: ValidationError[] = await validate(report, VALID_OPT).catch((error) => {
    throw new Error(
      `Failed to validate the CollectedFees report for integrator '${report.integrator}'\n${error}`
    )
  })

  if (validationErr.length > 0) {
    logger.warn(
      `Validation of CollectedFees report for integrator ${report.integrator} generates ${validationErr.length} issue(s)\n${validationErr}`
    )
  }
  return validationErr
}

/**
 * Validates if the given value is a valid account ID.
 *
 * @param account The account ID to validate.
 * @returns A list of validation errors if the ID is not valid, empty if it is valid.
 */
export function validateAccountId(account: string): ValidationError[] {
  if (isAlphanumeric(account) && isHexadecimal(account) && isEthereumAddress(account)) {
    return []
  }
  return [{
    property: 'integratorId',
    value: account,
    constraints: {
      isAlphanumeric: 'Unsupported integrator address',
      isEthereumAddress: 'Invalid Ethereum address',
    },
  }]
}
