import { create } from 'zustand'

interface User {
  id: number
  username: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('helbackup_token'),
  isAuthenticated: !!localStorage.getItem('helbackup_token'),

  setAuth: (token, user) => {
    localStorage.setItem('helbackup_token', token)
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('helbackup_token')
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
