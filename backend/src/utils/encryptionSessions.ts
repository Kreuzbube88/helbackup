import crypto from 'node:crypto'
import { logger } from './logger.js'

interface EncryptionSession {
  backupId: string
  password: string
  createdAt: Date
  expiresAt: Date
}

class EncryptionSessionStore {
  private readonly sessions = new Map<string, EncryptionSession>()
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

  createSession(backupId: string, password: string): string {
    const sessionId = crypto.randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT_MS)

    this.sessions.set(sessionId, { backupId, password, createdAt: now, expiresAt })

    setTimeout(() => {
      this.sessions.delete(sessionId)
      logger.info(`Encryption session expired: ${sessionId}`)
    }, this.SESSION_TIMEOUT_MS)

    logger.info(`Created encryption session: ${sessionId} for backup ${backupId}`)
    return sessionId
  }

  getSession(sessionId: string): EncryptionSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId)
      return null
    }

    return session
  }

  getPassword(sessionId: string): string | null {
    return this.getSession(sessionId)?.password ?? null
  }

  invalidateSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    logger.info(`Invalidated encryption session: ${sessionId}`)
  }

  invalidateAllForBackup(backupId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.backupId === backupId) {
        this.sessions.delete(sessionId)
      }
    }
  }
}

export const encryptionSessions = new EncryptionSessionStore()
