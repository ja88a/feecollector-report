import { BlockTag } from '@ethersproject/abstract-provider'
import { Injectable } from '@nestjs/common'
import { BigNumber, ethers } from 'ethers'
import {
  FeeCollectorChainConfig,
  feeCollectorChainConfigDefault,
} from 'feecollector-report-common/dist/config'
import { FeeCollectedEventParsed } from 'feecollector-report-common/dist/data'
import {
  EventScrapingChainConfigPersistence,
  FeeCollectedEventPersistence,
} from 'feecollector-report-common/dist/database'
import { default as Logger } from 'feecollector-report-common/dist/logger/logger'
import { FeeCollector__factory } from 'lifi-contract-typings'

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
  public async scrapFeeCollectorEvents(chainKey: string): Promise<void> {
    // Get the target FeeCollector chain configuration
    const feeCollectorChainConfig = await this.retrieveFeeCollectorChainConfig(chainKey)

    // Init the virtual contract on the target chain
    const feeCollectorContract = this.initFeeCollectorContract(
      feeCollectorChainConfig.feeCollectorContract,
      feeCollectorChainConfig.rpcUrl
    )

    // Get the chain last block number
    const chainLastBlockNb = await feeCollectorContract.provider.getBlockNumber()
    const lastScannedBlockNb =
      feeCollectorChainConfig.feeCollectorBlockLastScanned ||
      feeCollectorChainConfig.feeCollectorBlockStart
    this.logger.info(
      `Scraping FeeCollector.FeeCollected events on chain '${chainKey}' from block ${lastScannedBlockNb + 1} to last block ${chainLastBlockNb}`
    )

    // Scrape the fee collected events through batches of block scanning
    let countCollectedEvents = 0
    const batchSize = 1000
    let blockStart = lastScannedBlockNb + 1
    while (blockStart <= chainLastBlockNb) {
      let blockEnd = blockStart + batchSize
      if (blockEnd > chainLastBlockNb) {
        blockEnd = chainLastBlockNb
      }

      this.logger.debug(`Processing ${chainKey} blocks from ${blockStart} to ${blockEnd}`)

      // Load the onchain events
      const feeCollectedEvents = await this.loadFeeCollectorEvents(
        feeCollectorContract,
        blockStart,
        blockEnd
      )

      if (feeCollectedEvents.length > 0) {
        this.logger.info(`Found ${feeCollectedEvents.length} FeeCollectedEvent${feeCollectedEvents.length>1?'s':''} (last block ${blockEnd})`)

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
      await this.eventScrapingChainConfigPersistence.updateFeeCollectorLastScannedBlock(
        feeCollectorChainConfig.docId || '',
        blockEnd
      )
      
      // Update the start block number to scan the next batch of blocks
      blockStart = blockEnd + 1
    }

    this.logger.info(`${countCollectedEvents} FeeCollectedEvent${countCollectedEvents>1?'s':''} scraped successfully from chain '${chainKey}'`)
  }

  /**
   * Retrieves the FeeCollector chain configuration from the database
   * If it doesn't exist, it will be created from the available default configurations
   * @param chainKey the unique Lifi key of the target blockchain hosting the Lifi FeeCollector contract
   * @returns the target FeeCollector chain configuration
   */
  async retrieveFeeCollectorChainConfig(chainKey: string): Promise<FeeCollectorChainConfig> {
    const storedConfig = await this.eventScrapingChainConfigPersistence.getByChain(chainKey)
    if (!storedConfig) {
      const feeCollectorChainConfig = feeCollectorChainConfigDefault.get(chainKey)
      if (!feeCollectorChainConfig) {
        throw new Error(
          `No default configuration found for the FeeCollector scraping on chain '${chainKey}'`
        )
      }
      this.logger.info(
        `Persisting default FeeCollector scraping configuration for chain '${chainKey}': ${JSON.stringify(feeCollectorChainConfig)}`
      )
      return await this.eventScrapingChainConfigPersistence.createFeeCollectorEventScrapingConfig(
        chainKey,
        feeCollectorChainConfig
      )
    }
    this.logger.info(
      `FeeCollector scraping config for chain '${chainKey}:' ${JSON.stringify(storedConfig)}`
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
        chainKey: chainKey,
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
