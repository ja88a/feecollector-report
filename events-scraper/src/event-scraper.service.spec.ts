import { ConfigService } from "@nestjs/config"
import { ethers } from "ethers"
import { StoreEventScrapingChainConfig, StoreFeeCollectedEvent } from "feecollector-report-common"
import { FeeCollectorEventsScraper } from "./events-scraper.service"

describe('FeeCollectorEventsScraper', () => {
    let scraper: FeeCollectorEventsScraper
    let mockFeeCollectorContract: jest.Mocked<ethers.Contract>
    let mockEventScrapingChainConfigPersistence: jest.Mocked<StoreEventScrapingChainConfig>
    let mockFeeCollectedEventPersistence: jest.Mocked<StoreFeeCollectedEvent>
    let mockConfigService: jest.Mocked<ConfigService>
  
    beforeEach(() => {
      mockFeeCollectorContract = {
        provider: {
          getBlockNumber: jest.fn().mockResolvedValue(100),
        },
        queryFilter: jest.fn(),
        interface: {
          parseLog: jest.fn(),
        },
      } as unknown as jest.Mocked<ethers.Contract>
  
      mockEventScrapingChainConfigPersistence = {
        getByChain: jest.fn(),
        createFeeCollectorEventScrapingConfig: jest.fn(),
        updateFeeCollectorLastScannedBlock: jest.fn(),
      } as unknown as jest.Mocked<StoreEventScrapingChainConfig>
  
      mockFeeCollectedEventPersistence = {
        storeFeeCollectedEvents: jest.fn(),
      } as unknown as jest.Mocked<StoreFeeCollectedEvent>
  
      mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'SCRAPER_BLOCKS_BATCH_SIZE':
              return '10'
            default:
              return ''
          }
        }),
      } as unknown as jest.Mocked<ConfigService>
  
      scraper = new FeeCollectorEventsScraper(
        mockConfigService,
        mockEventScrapingChainConfigPersistence,
        mockFeeCollectedEventPersistence
      )
    })


})