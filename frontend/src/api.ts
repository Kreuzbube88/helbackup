const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('helbackup_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(err.error ?? res.statusText)
  }

  return res.json() as Promise<T>
}

interface LoginResponse {
  token: string
  user: { id: number; username: string }
}

interface MeResponse {
  user: { id: number; username: string }
}

export interface Job {
  id: string
  name: string
  enabled: boolean
  schedule: string | null
  steps: unknown[]
  created_at: string
  updated_at: string
}

export interface Target {
  id: string
  name: string
  type: string
  config: Record<string, unknown>
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface JobHistoryRun {
  id: string
  job_id: string
  status: 'running' | 'success' | 'failed' | 'cancelled'
  started_at: string
  ended_at: string | null
  duration_s: number | null
}

export interface Container {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
}

export const api = {
  setup: {
    checkStatus: () =>
      request<{ firstRun: boolean }>('GET', '/setup/status'),
    completeSetup: (username: string, password: string, language: string) =>
      request<{ success: boolean; recoveryKey: string }>('POST', '/setup/complete', { username, password, language }),
  },

  auth: {
    login: (username: string, password: string) =>
      request<LoginResponse>('POST', '/auth/login', { username, password }),
    logout: () =>
      request<{ ok: boolean }>('POST', '/auth/logout'),
    me: () =>
      request<MeResponse>('GET', '/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: boolean }>('POST', '/auth/change-password', { currentPassword, newPassword }),
    recover: (recoveryKey: string, newPassword: string) =>
      request<{ success: boolean }>('POST', '/auth/recover', { recoveryKey, newPassword }),
    getLanguage: () =>
      request<{ language: string }>('GET', '/auth/language'),
  },

  jobs: {
    getAll: () => request<Job[]>('GET', '/jobs'),
    getById: (id: string) => request<Job>('GET', `/jobs/${id}`),
    create: (data: { name: string; schedule?: string; steps: unknown[]; enabled?: boolean }) =>
      request<Job>('POST', '/jobs', data),
    update: (id: string, data: Partial<{ name: string; schedule: string | null; steps: unknown[]; enabled: boolean }>) =>
      request<Job>('PUT', `/jobs/${id}`, data),
    delete: (id: string) => request<{ ok: boolean }>('DELETE', `/jobs/${id}`),
    getHistory: (id: string) => request<unknown[]>('GET', `/jobs/${id}/history`),
    execute: (id: string) => request<{ runId: string }>('POST', `/jobs/${id}/execute`),
  },

  targets: {
    getAll: () => request<Target[]>('GET', '/targets'),
    getById: (id: string) => request<Target>('GET', `/targets/${id}`),
    create: (data: { name: string; type: string; config: Record<string, unknown>; enabled?: boolean }) =>
      request<Target>('POST', '/targets', data),
    update: (id: string, data: Partial<{ name: string; type: string; config: Record<string, unknown>; enabled: boolean }>) =>
      request<Target>('PUT', `/targets/${id}`, data),
    delete: (id: string) => request<{ ok: boolean }>('DELETE', `/targets/${id}`),
    getGFSConfig: (targetId: number) =>
      request<{ retentionScheme: string; gfsConfig: { dailyKeep: number; weeklyKeep: number; monthlyKeep: number }; simpleRetention: { days: number; minimumBackups: number } }>('GET', `/targets/${targetId}/gfs`),
    updateGFSConfig: (targetId: number, data: { retentionScheme: string; gfsConfig: { dailyKeep: number; weeklyKeep: number; monthlyKeep: number } }) =>
      request<{ success: boolean }>('POST', `/targets/${targetId}/gfs`, data),
    previewGFSCleanup: (targetId: number) =>
      request<unknown>('GET', `/targets/${targetId}/gfs/preview`),
    executeGFSCleanup: (targetId: number) =>
      request<unknown>('POST', `/targets/${targetId}/gfs/cleanup`),
    calculateGFSSavings: (data: { backupSizeGB: number; backupsPerWeek: number; currentRetentionDays: number; gfsConfig: { dailyKeep: number; weeklyKeep: number; monthlyKeep: number } }) =>
      request<{ simple: { backupsKept: number; storageGB: number }; gfs: { backupsKept: number; storageGB: number }; savings: { storageGB: number; percent: number } }>('POST', '/gfs/calculator', data),
  },

  nas: {
    testWake: (mac: string, ip?: string) =>
      request<{ success: boolean }>('POST', '/nas/wake/test', { mac, ip }),
    testSSH: (host: string, port: number | undefined, username: string, password?: string, privateKey?: string) =>
      request<{ success: boolean }>('POST', '/nas/ssh/test', { host, port, username, password, privateKey }),
  },

  executions: {
    get: (runId: string) => request<JobHistoryRun>('GET', `/executions/${runId}`),
  },

  docker: {
    listContainers: () => request<Container[]>('GET', '/docker/containers'),
    inspectContainer: (id: string) => request<unknown>('GET', `/docker/containers/${id}`),
    stopContainer: (id: string) => request<{ ok: boolean }>('POST', `/docker/containers/${id}/stop`),
    startContainer: (id: string) => request<{ ok: boolean }>('POST', `/docker/containers/${id}/start`),
  },

  encryption: {
    checkStatus: () => request<{ configured: boolean }>('GET', '/encryption/status'),
    setup: (password: string) => request<{ success: boolean; recoveryKey: string }>('POST', '/encryption/setup', { password }),
    verify: (password: string) => request<{ valid: boolean }>('POST', '/encryption/verify', { password }),
    recover: (recoveryKey: string, newPassword: string) =>
      request<{ success: boolean }>('POST', '/encryption/recover', { recoveryKey, newPassword }),
  },

  decryption: {
    unlock: (backupId: string, password: string) =>
      request<{ success: boolean; sessionId: string; expiresIn: number }>('POST', '/decryption/unlock', { backupId, password }),
    decryptManifest: (backupPath: string, sessionId: string) =>
      request<unknown>('POST', '/decryption/manifest', { backupPath, sessionId }),
    decryptArchive: (backupPath: string, sessionId: string, outputDir: string) =>
      request<{ success: boolean; outputDir: string }>('POST', '/decryption/archive', { backupPath, sessionId, outputDir }),
  },

  notifications: {
    getAll: () => request<unknown[]>('GET', '/notifications'),
    get: (channel: string) => request<unknown>('GET', `/notifications/${channel}`),
    save: (data: { channel: string; enabled: boolean; config: Record<string, unknown>; events: string[] }) =>
      request<{ success: boolean }>('POST', '/notifications', data),
    delete: (channel: string) => request<{ success: boolean }>('DELETE', `/notifications/${channel}`),
    test: (channel: string, config: Record<string, unknown>) =>
      request<{ success: boolean }>('POST', '/notifications/test', { channel, config }),
    getLog: () => request<unknown[]>('GET', '/notifications/log'),
  },
}

export const notifications = {
  getAll: () => request<unknown[]>('GET', '/notifications'),
  get: (channel: string) => request<unknown>('GET', `/notifications/${channel}`),
  save: (data: { channel: string; enabled: boolean; config: Record<string, unknown>; events: string[] }) =>
    request<{ success: boolean }>('POST', '/notifications', data),
  delete: (channel: string) => request<{ success: boolean }>('DELETE', `/notifications/${channel}`),
  test: (channel: string, config: Record<string, unknown>) =>
    request<{ success: boolean }>('POST', '/notifications/test', { channel, config }),
  getLog: () => request<unknown[]>('GET', '/notifications/log'),
}

export const dashboard = {
  get: () => request<unknown>('GET', '/dashboard'),
}

export const recovery = {
  getStatus: () => request<{ enabled: boolean }>('GET', '/recovery/status'),
  enable: () => request<{ ok: boolean }>('POST', '/recovery/enable'),
  disable: () => request<{ ok: boolean }>('POST', '/recovery/disable'),
  getManifests: () => request<unknown[]>('GET', '/recovery/manifests'),
  getManifest: (backupId: string) => request<unknown>('GET', `/recovery/manifests/${backupId}`),
  scan: (scanPath: string) => request<{ manifests: unknown[]; count: number }>('POST', '/recovery/scan', { path: scanPath }),
  restoreContainers: (backupId: string, containers: string[]) =>
    request<{ restored: unknown[]; failed: unknown[] }>('POST', '/recovery/restore/containers', { backupId, containers }),
  restoreFiles: (backupId: string, files: string[], destination: string) =>
    request<{ message: string; files: number; destination: string }>('POST', '/recovery/restore/files', { backupId, files, destination }),
  getDatabaseRestore: (backupId: string, containerId: string, databaseType: string) =>
    request<{ dumpPath: string; restoreCommand: string; instructions: string[] }>('POST', '/recovery/restore/database', { backupId, containerId, databaseType }),
}
