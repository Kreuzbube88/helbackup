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

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<LoginResponse>('POST', '/auth/login', { username, password }),
    logout: () =>
      request<{ ok: boolean }>('POST', '/auth/logout'),
    me: () =>
      request<MeResponse>('GET', '/auth/me'),
  },
}
