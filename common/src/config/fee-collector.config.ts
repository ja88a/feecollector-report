import { ChainKey, ChainType, ChainId } from '@lifi/types'

/** Configuration of onchain LiFi FeeCollector contracts */
export interface FeeCollectorChainConfig {
    /** Lifi blockchain ID */
    chainId: ChainId,

    /** Lifi blockchain type */
    chainType: ChainType,

    /** URL of the default JSON RPC provider */
    rpcUrl: string,

    /** Lifi FeeCollector contract address, an hexa string */
    feeCollectorContract: string,
    
    /** The block number to consider for starting a new blockchain scan session of FeeCollector events */
    feeCollectorBlockStart: number,

    /** Last scanned block number during last scraping session of FeeCollected events */
    feeCollectorBlockLastScanned?: number,
}

/** Map of supported FeeCollector contracts per their hosting blockchain */
export const feeCollectorChainConfigDefault: Map<string, FeeCollectorChainConfig> = new Map([
    [ChainKey.POL, {
        chainType: ChainType.EVM,
        chainId: ChainId.POL,
        rpcUrl: 'https://polygon-rpc.com',
        feeCollectorContract: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
        feeCollectorBlockStart: 47961368,
    }],
]);
