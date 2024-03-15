import { Test, TestingModule } from '@nestjs/testing'
import { FeesReporterController } from './fees-reporter.controller'
import { FeesReporterService } from './fees-reporter.service'
import { EventScrapingChainConfig, FeeCollectedEvent, StoreFeeCollectedEvent } from 'feecollector-report-common/database'
import { StoreEventScrapingChainConfig } from 'feecollector-report-common/database'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { KindagooseModule } from 'kindagoose'

describe('FeesReporterController', () => {
  let feesReporterController: FeesReporterController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ cache: true, isGlobal: true }),
        KindagooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory(configService: ConfigService) {
            const mongoDbConnectUri = configService.get('MONGODB_USERNAME')
              ? `${configService.get('MONGODB_PROTOCOL')}://${configService.get('MONGODB_USERNAME')}:${configService.get('MONGODB_PASSWORD')}@${configService.get('MONGODB_HOST')}:${configService.get('MONGODB_PORT')}/${configService.get('MONGODB_DEFAULT_DATABASE')}`
              : `${configService.get('MONGODB_PROTOCOL')}://${configService.get('MONGODB_HOST')}:${configService.get('MONGODB_PORT')}/${configService.get('MONGODB_DEFAULT_DATABASE')}`
            return {
              uri: mongoDbConnectUri,
            }
          },
        }),
        KindagooseModule.forFeature([EventScrapingChainConfig, FeeCollectedEvent]),
      ],
      controllers: [FeesReporterController],
      providers: [FeesReporterService, 
        StoreEventScrapingChainConfig,
        StoreFeeCollectedEvent,],
    }).compile()

    feesReporterController = app.get<FeesReporterController>(FeesReporterController)
  })

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(feesReporterController.reportCollectedFeesBy('0x1234567890123456789012345678901234567890')).toBe('Hello World!')
    })
  })
})
