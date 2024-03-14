import { ChainKey, ChainType, ChainId } from '@lifi/types'
import { EBlockTagLatest, EEventScrapingStatus, FeeCollectorChainConfig } from '../data/FeeCollectorChainConfig'

/** Latest current version number of the FeeCollector Chain config schema */
export const VERSION_FEECOLLECTOR_CHAIN_CONFIG_LATEST = 1

/** Default max number of blocks used to define a range, a batch size, when iteratively scanning a chain */
export const CHAIN_SCAN_BLOCKS_BATCH_SIZE_DEFAULT = 2000

/** Default block tags to use for retrieving the latest available block on a blockchain */
export const CHAIN_LATEST_BLOCK_TAG_DEFAULT = 'finalized'

/** Default number of chain query attempts when previous has failed. Number of attempts before throwing an error. */
export const CHAIN_QUERY_FAIL_RETRY_NB_DEFAULT = 2

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
        lastBlockTag: EBlockTagLatest.DEFAULT,
      },
      feeCollector: {
        contract: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
        blockStart: 47961368,
      } 
    },
  ],
])
