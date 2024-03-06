import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { FeesReporterController } from './fees-reporter.controller'
import { FeesReporterService } from './fees-reporter.service'
import {
  EventScrapingChainConfig,
  EventScrapingChainConfigPersistence,
  FeeCollectedEvent,
  FeeCollectedEventPersistence,
} from 'feecollector-report-common'
import { KindagooseModule } from 'kindagoose'

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    KindagooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory(configService: ConfigService) {
        return {
          uri: 'mongodb://localhost:27017/fcrs', //`${configService.get('MONGODB_PROTOCOL')}://${configService.get('MONGODB_USERNAME')}:${configService.get('MONGODB_PASSWORD')}@${configService.get('MONGODB_HOST')}:${configService.get('MONGODB_PORT')}/${configService.get('MONGODB_DEFAULT_DATABASE')}`,
        }
      },
    }),
    KindagooseModule.forFeature([EventScrapingChainConfig, FeeCollectedEvent]),
  ],
  controllers: [FeesReporterController],
  providers: [
    FeesReporterService,
    EventScrapingChainConfigPersistence,
    FeeCollectedEventPersistence,
  ],
})
export class FeesReporterModule {}
