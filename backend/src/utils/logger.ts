import pino from 'pino'

const usePrettyLogs = process.env.LOG_FORMAT === 'pretty' || process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: usePrettyLogs ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{levelLabel} - {msg}'
    }
  } : undefined,
})
