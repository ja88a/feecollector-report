import { NestFactory } from '@nestjs/core'
import { EventsScraperModule } from './events-scraper.module'

import { HttpStatus } from '@nestjs/common'
import { Callback, Context, Handler } from 'aws-lambda'
import { FeeCollectorEventsScraper } from './events-scraper.service'
import { Logger } from 'feecollector-report-common/logger'

const logger = Logger.child({
  label: FeeCollectorEventsScraper.name,
})

/**
 * Serverless Function handler for the FeeCollectorEventsScraper main
 * function / entry point to initiate an event scraping session of
 * onchain FeeCollected events against the specified blockchain.
 *
 * @param event The triggering HTTP event from an API Gateway
 * @param _context Execution context of the function runtime environment
 * @param _callback Callback injected to this function to forward its response
 * @returns response status and body message
 */
export const scrapFeeCollectorEvents: Handler = async (
  event: any,
  _context: Context,
  _callback: Callback
) => {
  const { chain } = event.pathParameters
  return await startScraping(chain).then((resolvedResult) => {
    return JSON.stringify(resolvedResult)
  })
}

/**
 * Initiates the FeeCollectorEventsScraper service and starts a blockchain scanning session.
 * @param chainKey the key of the blockchain to scan
 * @returns an http-based response status and body message
 */
async function startScraping(chainKey: string) {
  const appContext = await NestFactory.createApplicationContext(EventsScraperModule)
  const appService = appContext.get(FeeCollectorEventsScraper)
  try {
    const res = await appService.scrapFeeCollectorEvents(chainKey)
    return {
      statusCode: HttpStatus.OK,
      body: res,
    }
  } catch (error: any) {
    const msgGenericMsg = `ERROR Scraping FeeCollector Events for chain '${chainKey}' failed`
    logger.error(`${msgGenericMsg} - Events Scraping session ABORTED\n`, error)
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        message: msgGenericMsg,
        // error: error.response ?? error.message
      },
    }
  }
}

// Local dev entry point emulating the launch of the `FeeCollectorEventsScraper` function.
// For automated local launch only - has no effect on a serverless deployment
startScraping('pol')
  .then((res) => logger.info(`Result: ${JSON.stringify(res)}`))
  .finally(() => process.exit())
