import { createLogger, format, transports } from 'winston'

import 'winston-daily-rotate-file'
import { DailyRotateFile } from 'winston/lib/winston/transports'

import { EConfigRunMode, LOGGER } from '../config'

/** Supported log levels */
const enum EConfigLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  default = INFO,
}

const logsMinLevel = process.env.LOG_LEVEL || EConfigLogLevel.default

/**
 * WinstonJS Logger integration
 *
 * Refer to [winstonjs/winston](https://github.com/winstonjs/winston)
 *
 * Integrates an automatic Daily File Rotation for local log files and a retention policy over time
 */
export const Logger = createLogger({
  level: logsMinLevel,
  exitOnError: true, // Default is `true` for not interfering
  format: format.combine(
    format.timestamp({
      format: LOGGER.TIMESTAMP_PATTERN,
    }),
    format.json()
  ),
  defaultMeta: { service: 'account-updates-ingestor' },
  transports: [
    // - Write all logs with importance level of `error` or less to `error.log`
    new DailyRotateFile({
      filename: LOGGER.OUTPUT_DIR + 'error-%DATE%.log',
      level: 'error',
      datePattern: LOGGER.FILE_DATE_PATTERN,
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '10d',
    }),
    // - Write all logs with importance level of `info` or less to `combined.log`
    new DailyRotateFile({
      filename: LOGGER.OUTPUT_DIR + 'combined-%DATE%.log',
      level: logsMinLevel,
      datePattern: LOGGER.FILE_DATE_PATTERN,
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '5d',
    }),
    // // AWS CloudWatch connector -> requires `winston-aws-cloudwatch`
    // new CloudWatchLogsTransport({
    //   logGroupName: 'feescollector-log-group',
    //   logStreamName: 'feescollector-scraper-log-stream',
    //   awsAccessKeyId: 'my-access-key-id',
    //   awsSecretKey: 'my-secret-key',
    //   awsRegion: 'eu-west-3'
    // }),
  ],
  exceptionHandlers: [
    //new transports.File({ filename: LOGGER.OUTPUT_DIR + 'exceptions.log' }),
    new DailyRotateFile({
      filename: LOGGER.OUTPUT_DIR + 'exceptions-%DATE%.log',
      datePattern: LOGGER.FILE_DATE_PATTERN,
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '31d',
    }),
  ],
})

//
// If we're not in production mode then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== EConfigRunMode.PROD) {
  const consoleFormat = format.printf(({ timestamp, label, level, message }) => {
    return `${timestamp} ${level} [${label}] ${message}`
  })

  const alignedWithColorsAndTime = format.combine(
    format.colorize({ all: true }),
    format.timestamp({ format: LOGGER.TIMESTAMP_PATTERN }),
    consoleFormat
  )

  Logger.add(
    new transports.Console({
      level: logsMinLevel,
      format: alignedWithColorsAndTime,
      handleExceptions: true,
    })
  )
}
