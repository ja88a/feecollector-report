import { NestFactory } from '@nestjs/core'
import { FeesReporterModule } from './fees-reporter.module'
import { EConfigRunMode, MS_CONFIG } from 'feecollector-report-common/config'
import { LogLevel, VersioningType } from '@nestjs/common'

import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger'

import { Logger } from 'feecollector-report-common/logger'

/** Private logger */
const logger = Logger.child({
  label: 'FeesReporterMain',
})

async function bootstrap() {
  // Initiate the app, with the default logger
  const app = await NestFactory.create(FeesReporterModule, {
    logger:
      process.env.NODE_ENV == EConfigRunMode.PROD
        ? ['fatal', 'error', 'warn'] // false
        : ['fatal', 'error', 'warn', 'log', 'debug'],
  })

  // Prefix all URIs of this service's HTTP REST API
  app.setGlobalPrefix(MS_CONFIG.URI_DOMAIN_API)

  // Enable the URI-based versioning of APIs
  app.enableVersioning({
    type: VersioningType.URI,
  })

  // Listen for shutdown hooks
  app.enableShutdownHooks()

  // Publish the app server's OpenAPI
  if (process.env.OPENAPI_PUBLISH === 'true' ? true : MS_CONFIG.OPENAPI_PUBLISH) {
    const config = new DocumentBuilder()
      .setTitle('FeeCollector Reporter API')
      .setDescription('REST API specifications for the Li.Fi Collected Fees Reporter API')
      .setVersion(MS_CONFIG.VERSION_PUBLIC+'.0')
      .build()
    const options: SwaggerDocumentOptions = {
      deepScanRoutes: true,
      ignoreGlobalPrefix: false,
    }
    const document = SwaggerModule.createDocument(app, config, options)
    SwaggerModule.setup(MS_CONFIG.URI_DOMAIN_API, app, document)
    logger.warn(
      `Publishing the REST OpenAPI specifications at URI /${MS_CONFIG.URI_DOMAIN_API} (json: /${MS_CONFIG.URI_DOMAIN_API}-json)`
    )
  }

  // Start the app
  const port = process.env.PORT || MS_CONFIG.PORT_EXPOSED
  logger.warn(
    `Exposing REST API to port ${port} under URI /${MS_CONFIG.URI_DOMAIN_API}/v${MS_CONFIG.VERSION_PUBLIC}`
  )
  await app.listen(port)
}
bootstrap()
