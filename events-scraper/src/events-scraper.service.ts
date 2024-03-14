import { BlockTag } from '@ethersproject/abstract-provider'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config/dist/config.service'
import { BigNumber, ethers } from 'ethers'
import {
  CHAIN_LATEST_BLOCK_TAG_DEFAULT,
  CHAIN_QUERY_FAIL_RETRY_NB_DEFAULT,
  CHAIN_SCAN_BLOCKS_BATCH_SIZE_DEFAULT,
  feeCollectorChainConfigDefault,
} from 'feecollector-report-common/config'
import {
  EventScrapingChainConfigPersistence,
  FeeCollectedEventPersistence,
} from 'feecollector-report-common/database'
import { Logger } from 'feecollector-report-common/logger'
import { FeeCollector__factory } from 'lifi-contract-typings'
import { ResultEventScrapingSession } from './dto/ResultEventScrapingSession.dto'
import {
  EEventScrapingStatus,
  FeeCollectedEventParsed,
  FeeCollectorChainConfig,
} from 'feecollector-report-common/data'
import { ChainKey } from '@lifi/types'

/**
 * Service for scraping Lifi FeeCollector contracts' events.
 *
 * Onchain events are scraped using the Lifi contract ABI, from a given range of blocks,
 * then stored in a database for later processing.
 */
@Injectable()
export class FeeCollectorEventsScraper {
  /** Logger */
  private readonly logger = Logger.child({
    label: FeeCollectorEventsScraper.name,
  })

  constructor(
    /** Config settings service */
    private readonly configService: ConfigService,
    /** DB connector for the EventScrapingChain config */
    private eventScrapingChainConfigPersistence: EventScrapingChainConfigPersistence,
    /** DB connector for the FeeCollected events */
    private feeCollectedEventPersistence: FeeCollectedEventPersistence
  ) {}

  /**
   * Initiates the scraping of latest events emitted by the Lifi FeeCollector contract
   *
   * @param chainKey Unique LiFi key of the target blockchain hosting the Lifi FeeCollector contract
   */
  public async scrapFeeCollectorEvents(chainKey: ChainKey): Promise<ResultEventScrapingSession> {
    // Get the target FeeCollector chain configuration
    const chainConfig = await this.retrieveFeeCollectorChainConfig(chainKey).catch((error) => {
      throw new Error(
        `Failed to retrieve the FeeCollector Scraping Config for chain '${chainKey}'\n${error.stack}`
      )
    })

    // Check that the FeeCollector chain scraping is enabled
    if (chainConfig.status === EEventScrapingStatus.INACTIVE) {
      const logMsg = `FeeCollector Events Scraping sessions HALTED on chain '${chainKey}'. Last scanned block: ${chainConfig.feeCollector.lastScanBlock}`
      this.logger.warn(logMsg+ ` on ${new Date(chainConfig.feeCollector.lastScanTime || 0).toISOString()}`)
      return {
        message: logMsg,
        eventsNew: 0,
        blocksScanned: 0,
      }
    }

    // Init the virtual onchain contract for the target chain
    const feeCollectorContract = this.initFeeCollectorContract(
      chainConfig.feeCollector.contract,
      chainConfig.chain.rpcUrl
    )

    // Get the chain last block number
    const { chainLastBlockNb, lastBlockTag } = await this.getChainLastBlock(
      chainConfig,
      feeCollectorContract
    )

    // Get the block number, last scanned one [and persisted in DB] or the one to start from per the target chain configuration
    const lastScannedBlockNb =
      chainConfig.feeCollector.lastScanBlock || chainConfig.feeCollector.blockStart - 1

    // Log the scraping session info
    this.logger.info(
      `Scraping FeeCollector.FeeCollected events on chain '${chainKey}'` +
        ` from block ${lastScannedBlockNb + 1 > chainLastBlockNb ? chainLastBlockNb : lastScannedBlockNb + 1} to last block ${chainLastBlockNb}` +
        ` (${lastBlockTag})`
    )

    // Scrape the fee collected events through batches of blocks scanning
    const countCollectedEvents = await this.extractAndStoreBlockEvents(
      lastScannedBlockNb,
      chainLastBlockNb,
      feeCollectorContract,
      chainConfig
    ).catch((error) => {
      throw new Error(`Failed to extract and store events from chain '${chainKey}'\n${error.stack}`)
    })

    // Compute the scraping session result
    return {
      message: `${countCollectedEvents} new FeeCollected Event${countCollectedEvents > 1 ? 's' : ''} scraped ${countCollectedEvents > 0 ? 'successfully ' : ''}from chain '${chainKey}'`,
      eventsNew: countCollectedEvents,
      blocksScanned: chainLastBlockNb - lastScannedBlockNb,
    }
  }

  /**
   * Retrieves the last block number of the chain, using the BlockTag provided in the chain configuration.
   * 
   * Note: provider.getBlockNumber() returns latest block number (tag `latest`), not the last confirmed or safe block
   * 
   * @param chainConfig the FeeCollector chain configuration
   * @param feeCollectorContract the FeeCollector contract instance
   * @returns the last block number and the BlockTag used to retrieve it
   */
  private async getChainLastBlock(
    chainConfig: FeeCollectorChainConfig,
    feeCollectorContract: ethers.Contract,
    nbRetries?: number
  ): Promise<{ chainLastBlockNb: number; lastBlockTag: BlockTag }> {
    const lastBlockTag = chainConfig.chain.lastBlockTag || CHAIN_LATEST_BLOCK_TAG_DEFAULT
    const chainLastBlockNb = await feeCollectorContract.provider
      .getBlock(lastBlockTag)
      .then((lastBlock) => {
        return lastBlock.number
      })
      .catch(async (error) => {
        const retriesLeft = nbRetries ? nbRetries - 1 : CHAIN_QUERY_FAIL_RETRY_NB_DEFAULT - 1
        if (retriesLeft > 0) {
          this.logger.warn(
            `Failed attempt to retrieve last block number for chain '${chainConfig.chainKey}' using the Block Tag '${lastBlockTag}' (Attempts left: ${retriesLeft}): ${error}`
          )
          const result = await this.getChainLastBlock(
            chainConfig,
            feeCollectorContract,
            retriesLeft
          )
          return result.chainLastBlockNb
        } else {
          throw new Error(
            `Failed to retrieve last block number for chain '${chainConfig.chainKey}' using the Block Tag '${lastBlockTag}'\n${error.stack}`
          )
        }
      })
    return { chainLastBlockNb, lastBlockTag }
  }

  /**
   * Scrapes FeeCollector.FeeCollected events from the blockchain blocks, starting from the last scanned block until last one.
   * Operates in batches of blocks, to reduce the number of calls to the RPC provider, the data post-processing & its DB storage.
   * @param lastScannedBlockNb The last block number that was scanned.
   * @param chainLastBlockNb The last block number of the chain.
   * @param chainKey The unique key of the chain.
   * @param feeCollectorContract The FeeCollector contract instance.
   * @param feeCollectorChainConfig The FeeCollector chain configuration.
   * @returns The number of FeeCollected events that were scraped.
   */
  private async extractAndStoreBlockEvents(
    lastScannedBlockNb: number,
    chainLastBlockNb: number,
    feeCollectorContract: ethers.Contract,
    feeCollectorChainConfig: FeeCollectorChainConfig
  ) {
    const chainKey = feeCollectorChainConfig.chainKey || ''
    let countCollectedEvents = 0
    const batchSize = +this.configService.get(
      'CHAIN_SCAN_BLOCKS_BATCH_SIZE',
      CHAIN_SCAN_BLOCKS_BATCH_SIZE_DEFAULT
    )
    let blockStart = lastScannedBlockNb + 1
    while (blockStart <= chainLastBlockNb) {
      let blockEnd = blockStart + batchSize - 1
      if (blockEnd > chainLastBlockNb) {
        blockEnd = chainLastBlockNb
      }

      this.logger.debug(
        `Scanning blocks of '${chainKey}' from ${blockStart} to ${blockEnd} (batch size: ${blockEnd - blockStart + 1})`
      )

      // Load the onchain events
      const feeCollectedEvents = await this.loadFeeCollectorEvents(
        feeCollectorContract,
        blockStart,
        blockEnd
      )

      if (feeCollectedEvents.length > 0) {
        this.logger.info(
          `Found ${feeCollectedEvents.length} FeeCollected Event${feeCollectedEvents.length > 1 ? 's' : ''} (last block ${blockEnd})`
        )

        // Parse the fee collected events
        const feeCollectedEventsParsed = this.parseFeeCollectorEvents(
          chainKey,
          feeCollectorContract,
          feeCollectedEvents
        )

        // Persist the fee collected events
        await this.feeCollectedEventPersistence.storeFeeCollectedEvents(feeCollectedEventsParsed)

        countCollectedEvents += feeCollectedEvents.length
      }

      // Persist the last scanned block number
      await this.eventScrapingChainConfigPersistence.updateFeeCollectorLastScanInfo(
        feeCollectorChainConfig,
        blockEnd
      )

      // Update the start block number to scan the next batch of blocks
      blockStart = blockEnd + 1
    }
    return countCollectedEvents
  }

  /**
   * Retrieves the FeeCollector chain configuration from the database
   * If it doesn't exist, it will be created from the available default configurations
   * @param chainKey the unique Lifi key of the target blockchain hosting the Lifi FeeCollector contract
   * @returns the target FeeCollector chain configuration
   */
  async retrieveFeeCollectorChainConfig(chainKey: ChainKey): Promise<FeeCollectorChainConfig> {
    const storedConfig = await this.eventScrapingChainConfigPersistence.getByChain(chainKey)
    if (!storedConfig) {
      const feeCollectorChainConfig = feeCollectorChainConfigDefault.get(chainKey)
      if (!feeCollectorChainConfig) {
        throw new Error(
          `No default configuration found for the FeeCollector scraping on chain '${chainKey}'`
        )
      }
      this.logger.debug(
        `Persisting a default FeeCollector scraping configuration for chain '${chainKey}'`
      )
      return await this.eventScrapingChainConfigPersistence.createFeeCollectorEventScrapingConfig(
        chainKey,
        feeCollectorChainConfig
      )
    }
    this.logger.info(
      `FeeCollector scraping config for chain '${chainKey}' : ${JSON.stringify(storedConfig)}`
    )
    return storedConfig
  }

  /**
   * Initializes the FeeCollector contract instance for the given chain.
   * @param contractAddress The address of the FeeCollector contract.
   * @param providerRpcUrl The URL of the RPC provider.
   * @returns The virtual FeeCollector contract instance.
   */
  private initFeeCollectorContract(
    contractAddress: string,
    providerRpcUrl: string
  ): ethers.Contract {
    return new ethers.Contract(
      contractAddress,
      FeeCollector__factory.createInterface(),
      new ethers.providers.JsonRpcProvider(providerRpcUrl)
    )
  }

  /**
   * For a given block range all `FeesCollected` events are loaded from the FeeCollector contract.
   * @param feeCollector The FeeCollector onchain contract to load events from.
   * @param fromBlock The block number to start loading events from.
   * @param toBlock The block number to stop loading events at.
   * @returns The list of loaded events.
   */
  private async loadFeeCollectorEvents(
    feeCollector: ethers.Contract,
    fromBlock: BlockTag,
    toBlock: BlockTag,
    nbRetries?: number
  ): Promise<ethers.Event[]> {
    const filter = feeCollector.filters.FeesCollected()
    return await feeCollector.queryFilter(filter, fromBlock, toBlock).catch((error) => {
      const retriesLeft = nbRetries ? nbRetries - 1 : CHAIN_QUERY_FAIL_RETRY_NB_DEFAULT - 1
      if (retriesLeft > 0) {
        this.logger.warn(
          `Failed attempt to query FeeCollected events on blocks [${fromBlock}, ${toBlock}] (Attempts left: ${retriesLeft}): ${error}`
        )
        return this.loadFeeCollectorEvents(feeCollector, fromBlock, toBlock, retriesLeft)
      } else {
        throw new Error(
          `Failed to query FeeCollected events in blocks [${fromBlock}, ${toBlock}]\n${error.stack}`
        )
      }
    })
  }

  /**
   * Parses FeeCollector.FeeCollected events to an internal data structure.
   * @param chainKey the unique blockchain key from which the event comes from
   * @param feeCollector the FeeCollector virtual contract responsible of the events.
   * @param events a list of FeeCollected events emitted by the FeeCollector contract.
   * @returns
   */
  private parseFeeCollectorEvents(
    chainKey: string,
    feeCollector: ethers.Contract,
    events: ethers.Event[]
  ): FeeCollectedEventParsed[] {
    return events.map((event) => {
      const parsedEvent = feeCollector.interface.parseLog(event)

      const feesCollected: FeeCollectedEventParsed = {
        chainKey: <ChainKey>chainKey,
        txHash: event.transactionHash,
        blockTag: event.blockNumber,
        token: parsedEvent?.args[0],
        integrator: parsedEvent?.args[1],
        integratorFee: BigNumber.from(parsedEvent?.args[2]),
        lifiFee: BigNumber.from(parsedEvent?.args[3]),
      }
      return feesCollected
    })
  }
}
