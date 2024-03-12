import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { KindagooseModule } from 'kindagoose'
import { FeeCollectorEventsScraper } from './events-scraper.service'
import {
  EventScrapingChainConfig,
  EventScrapingChainConfigPersistence,
  FeeCollectedEvent,
  FeeCollectedEventPersistence,
} from 'feecollector-report-common/database'

/**
 * FeeCollector events scraping main module.
 *
 * It featuring a database connector and data persistence services,
 * and a config module for the configuration of the scraping session.
 */
@Module({
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
  controllers: [],
  providers: [
    FeeCollectorEventsScraper,
    EventScrapingChainConfigPersistence,
    FeeCollectedEventPersistence,
  ],
})
export class EventsScraperModule {}
