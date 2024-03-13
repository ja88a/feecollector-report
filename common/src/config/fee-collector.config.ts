import { ChainKey, ChainType, ChainId } from '@lifi/types'
import { EEventScrapingStatus, FeeCollectorChainConfig } from '../data/FeeCollectorChainConfig'

export const VERSION_FEECOLLECTOR_CHAIN_CONFIG_LATEST = 1

/** Map of FeeCollector scraping config for the supported blockchains */
export const feeCollectorChainConfigDefault: Map<string, FeeCollectorChainConfig> = new Map([
  [
    // Polygon Mainnet
    ChainKey.POL,
    {
      version: VERSION_FEECOLLECTOR_CHAIN_CONFIG_LATEST,
      status: EEventScrapingStatus.ACTIVE,
      chain: {
        id: ChainId.POL,
        type: ChainType.EVM,
        rpcUrl: 'https://polygon-rpc.com',
        latestBlockTag: 'safe', // 'safe' | 'finalized' : once supported post-merge
      },
      feeCollector: {
        contract: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
        blockStart: 47961368,
      } 
    },
  ],
])
