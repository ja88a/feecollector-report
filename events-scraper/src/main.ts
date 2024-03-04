import { NestFactory } from '@nestjs/core';
import { EventsScraperModule } from './events-scraper.module';

import { HttpStatus } from '@nestjs/common';
import { Callback, Context, Handler } from 'aws-lambda';
import { FeeCollectorEventsScraper } from './events-scraper.service';

export const scrapFeeCollectorEvents: Handler = async (
  event: any,
  _context: Context,
  _callback: Callback,
) => {
  const appContext = await NestFactory.createApplicationContext(EventsScraperModule);
  const appService = appContext.get(FeeCollectorEventsScraper);
  const { chain } = event.pathParameters;
  try {
    const res = await appService.scrapFeeCollectorEvents(chain);
    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(res),
    };
  } catch (error: any) {
    console.log(error);
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      body: JSON.stringify(error.response ?? error.message),
    };
  }
};