declare module 'wake_on_lan' {
  interface WakeOptions {
    address?: string
    num_packets?: number
    interval?: number
    port?: number
  }

  function wake(mac: string, callback: (error: Error | null) => void): void
  function wake(mac: string, options: WakeOptions, callback: (error: Error | null) => void): void

  export = { wake }
}
