/**
 * Report the collected fees by an integrator,
 * grouped by chain and their tokens.
 * 
 * Corresponding LiFi shared fees are reported.
 */
export interface IntegratorCollectedFeesReport {
    /** Address of the integrator */
    integrator: string

    /** Fees collected by the integrator */
    integratorCollectedFees: ChainTokenAmount[]

    /** Share of the fees collected by LiFi */
    lifiCollectedFees: ChainTokenAmount[]
}

/**
 * Total amount of fees per the chain and token asset
 */
export interface ChainTokenAmount {
    /** Unique chain key, refer to LiFi data types */
    chainKey: string

    /** The token address on the specified chain */
    token: string

    /** Total amount, the string representation of corresponding BigNumber decimals  */
    amount: string
}
