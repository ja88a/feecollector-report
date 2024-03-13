import { BlockTag } from '@ethersproject/abstract-provider'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config/dist/config.service'
import { BigNumber, ethers } from 'ethers'
import { feeCollectorChainConfigDefault } from 'feecollector-report-common/config'
import {
  EventScrapingChainConfigPersistence,
  FeeCollectedEventPersistence,
} from 'feecollector-report-common/database'
import { Logger } from 'feecollector-report-common/logger'
import { FeeCollector__factory } from 'lifi-contract-typings'
import { ResultEventScrapingSession } from './dto/ResultEventScrapingSession.dto'
import { EEventScrapingStatus, FeeCollectedEventParsed, FeeCollectorChainConfig } from 'feecollector-report-common/data'
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

    // Check that the FeeCollector chain configuration is valid
    if (chainConfig.status === EEventScrapingStatus.INACTIVE) {
      return {
        message: `FeeCollector Events Scraping sessions HALTED on chain '${chainKey}' - Last scanned block: ${chainConfig.feeCollector.lastScanBlock}`,
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
    // Note: provider.getBlockNumber() returns latest block number, not the last confirmed or safe block
    const lastBlockTag = 'finalized' // chainConfig.chain.lastBlockTag
    const chainLastBlockNb = await feeCollectorContract.provider
      .getBlock(lastBlockTag)
      .then((lastBlock) => {
        return lastBlock.number
      })
      .catch((error) => {
        throw new Error(
          `Failed to retrieve the last block number for chain '${chainKey}' using BlockTag ${lastBlockTag} \n${error.stack}`
        )
      })

    // Get the block number, last scanned one [and persisted in DB] or the one to start from per the target chain configuration
    const lastScannedBlockNb =
      chainConfig.feeCollector.lastScanBlock || chainConfig.feeCollector.blockStart - 1
    this.logger.info(
      `Scraping FeeCollector.FeeCollected events on chain '${chainKey}' from block ${lastScannedBlockNb + 1 > chainLastBlockNb ? chainLastBlockNb : lastScannedBlockNb + 1} to last block ${chainLastBlockNb}`
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
    const batchSize: number = +this.configService.get('SCRAPER_BLOCKS_BATCH_SIZE')
    let blockStart = lastScannedBlockNb + 1
    while (blockStart <= chainLastBlockNb) {
      let blockEnd = blockStart + batchSize
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
          `Found ${feeCollectedEvents.length} FeeCollectedEvent${feeCollectedEvents.length > 1 ? 's' : ''} (last block ${blockEnd})`
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
    toBlock: BlockTag
  ): Promise<ethers.Event[]> {
    const filter = feeCollector.filters.FeesCollected()
    return feeCollector.queryFilter(filter, fromBlock, toBlock)
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
        token: parsedEvent.args[0],
        integrator: parsedEvent.args[1],
        integratorFee: BigNumber.from(parsedEvent.args[2]),
        lifiFee: BigNumber.from(parsedEvent.args[3]),
      }
      return feesCollected
    })
  }
}
