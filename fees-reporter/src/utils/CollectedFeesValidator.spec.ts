import { Test } from '@nestjs/testing'
import {
  IntegratorCollectedFeesReport,
  createIntegratorCollectedFeesReport,
} from '../data/IntegratorCollectedFeesReport.dto'
import { validateReport } from './CollectedFeesValidator'

describe('validateReport', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [],
      providers: [],
    }).compile()
  })

  it('should return an empty array if the given report is valid', async () => {
    const report: IntegratorCollectedFeesReport = {
      integrator: '0x1234567890123456789012345678901234567890',
      integratorCollectedFees: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '1000000000000000000',
        },
      ],
      lifiCollectedFees: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '10000000000000000',
        },
      ],
    }

    const validationErr = await validateReport(createIntegratorCollectedFeesReport(report))

    expect(validationErr).toEqual([])
  })

  it('should return an error if the given report is invalid', async () => {
    const report = Object.assign(new IntegratorCollectedFeesReport(), {
      integrator: '0x1234567890123456789012345678901234567890ZZ',
      integratorCollectedFees: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '1000000000000000000',
        },
        {
          chainKey: 'pol',
          token: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000',
        },
      ],
      lifiCollectedFees: [
        {
          chainKey: 'pol',
          token: '0x0000000000000000000000000000000000000000',
          amount: '100000000000000',
        },
        {
          chainKey: 'pol',
          token: '0x1234567890123456789012345678901234567890',
          amount: '100000000000000',
        },
      ],
    })

    const validationErrs = await validateReport(createIntegratorCollectedFeesReport(report))

    if (validationErrs == null) {
        expect(validationErrs != null).toBeTruthy()
        return
    }

    expect(validationErrs.length > 0).toBeTruthy()
    expect(validationErrs[0].property).toEqual('integrator')
    expect(validationErrs[0].value).toEqual('0x1234567890123456789012345678901234567890ZZ')
    const validConstraints = validationErrs[0].constraints
    expect(validConstraints != null)
    expect(validConstraints).toEqual({
        "isEthereumAddress": "integrator must be an Ethereum address",
        "isHexadecimal": "integrator must be a hexadecimal number",
    })
  })
})
