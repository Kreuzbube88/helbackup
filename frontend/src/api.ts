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

export interface Container {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<LoginResponse>('POST', '/auth/login', { username, password }),
    logout: () =>
      request<{ ok: boolean }>('POST', '/auth/logout'),
    me: () =>
      request<MeResponse>('GET', '/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: boolean }>('POST', '/auth/change-password', { currentPassword, newPassword }),
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
  },

  targets: {
    getAll: () => request<Target[]>('GET', '/targets'),
    getById: (id: string) => request<Target>('GET', `/targets/${id}`),
    create: (data: { name: string; type: string; config: Record<string, unknown>; enabled?: boolean }) =>
      request<Target>('POST', '/targets', data),
    update: (id: string, data: Partial<{ name: string; type: string; config: Record<string, unknown>; enabled: boolean }>) =>
      request<Target>('PUT', `/targets/${id}`, data),
    delete: (id: string) => request<{ ok: boolean }>('DELETE', `/targets/${id}`),
  },

  nas: {
    testWake: (mac: string, ip?: string) =>
      request<{ success: boolean }>('POST', '/nas/wake/test', { mac, ip }),
    testSSH: (host: string, port: number | undefined, username: string, password?: string, privateKey?: string) =>
      request<{ success: boolean }>('POST', '/nas/ssh/test', { host, port, username, password, privateKey }),
  },

  docker: {
    listContainers: () => request<Container[]>('GET', '/docker/containers'),
    inspectContainer: (id: string) => request<unknown>('GET', `/docker/containers/${id}`),
    stopContainer: (id: string) => request<{ ok: boolean }>('POST', `/docker/containers/${id}/stop`),
    startContainer: (id: string) => request<{ ok: boolean }>('POST', `/docker/containers/${id}/start`),
  },
}
