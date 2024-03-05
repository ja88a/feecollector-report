import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { KindagooseModule, SchemaRegistrationOptions } from 'kindagoose'
import { FeeCollectorEventsScraper } from './events-scraper.service'
import {
  EventScrapingChainConfigPersistence,
  FeeCollectedEventPersistence,
  EventScrapingChainConfig,
  FeeCollectedEvent,
} from 'feecollector-report-common'

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    KindagooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory(configService: ConfigService) {
        return {
          uri: 'mongodb://localhost:27017/fcrs' //`${configService.get('MONGODB_PROTOCOL')}://${configService.get('MONGODB_USERNAME')}:${configService.get('MONGODB_PASSWORD')}@${configService.get('MONGODB_HOST')}:${configService.get('MONGODB_PORT')}/${configService.get('MONGODB_DEFAULT_DATABASE')}`,
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
