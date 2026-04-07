import { create } from 'zustand'

interface User {
  id: number
  username: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User, rememberMe?: boolean) => void
  logout: () => void
}

function getStoredToken(): string | null {
  return localStorage.getItem('helbackup_token') ?? sessionStorage.getItem('helbackup_token')
}

export const useStore = create<AuthStore>((set) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),

  setAuth: (token, user, rememberMe = false) => {
    if (rememberMe) {
      localStorage.setItem('helbackup_token', token)
    } else {
      sessionStorage.setItem('helbackup_token', token)
    }
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('helbackup_token')
    sessionStorage.removeItem('helbackup_token')
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
