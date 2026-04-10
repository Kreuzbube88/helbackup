import { create } from 'zustand'

interface UiStore {
  scanlineEnabled: boolean
  setScanlineEnabled: (v: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  scanlineEnabled: localStorage.getItem('helbackup_scanline') !== 'false',
  setScanlineEnabled: (v: boolean) => {
    localStorage.setItem('helbackup_scanline', String(v))
    set({ scanlineEnabled: v })
  },
}))
