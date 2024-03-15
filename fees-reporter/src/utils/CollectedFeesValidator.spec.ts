import { IntegratorCollectedFeesReport } from '../data/IntegratorCollectedFeesReport.dto'
import { validateReport } from './CollectedFeesValidator'

describe('validateReport', () => {
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

    const validationErr = await validateReport(report)

    expect(validationErr).toEqual([])
  })

  it('should return an error if the given report is invalid', async () => {
    const report = Object.assign(new IntegratorCollectedFeesReport(), {
      integrator: '0x1234567890123456789012345678901234567890',
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

    const validationErr = await validateReport(report)

    expect(validationErr).toEqual([
      {
        property: 'integratorCollectedFees[1].token',
        value: '0x1234567890123456789012345678901234567890',
        constraints: {
          isEthereumAddress: 'Invalid Ethereum address',
        },
      },
    ])
  })
})
