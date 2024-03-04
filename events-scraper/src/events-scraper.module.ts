import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { KindagooseModule } from 'kindagoose'
import { FeeCollectorEventsScraper } from './events-scraper.service'
import {
  EventScrapingChainConfig,
  FeeCollectedEvent,
  EventScrapingChainConfigPersistence,
  FeeCollectedEventPersistence,
} from 'feecollector-service-common'

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    KindagooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory(configService: ConfigService) {
        return {
          uri: `${configService.get('MONGODB_PROTOCOL')}://${configService.get('MONGODB_USERNAME')}:${configService.get('MONGODB_PASSWORD')}@${configService.get('MONGODB_HOST')}:${configService.get('MONGODB_PORT')}/${configService.get('MONGODB_DEFAULT_DATABASE')}`,
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
