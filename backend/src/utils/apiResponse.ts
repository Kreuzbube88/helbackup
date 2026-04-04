import { FastifyReply } from 'fastify'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

export function successResponse<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): FastifyReply {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  }
  return reply.status(statusCode).send(response)
}

export function errorResponse(
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown
): FastifyReply {
  const response: ApiResponse = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    meta: { timestamp: new Date().toISOString() },
  }
  return reply.status(statusCode).send(response)
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const
