import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSocket } from 'dgram'
import type { NetworkInterfaceInfo } from 'os'

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

type IfMap = NodeJS.Dict<NetworkInterfaceInfo[]>
let mockIfaces: IfMap = {}
vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return {
    ...actual,
    networkInterfaces: () => mockIfaces,
  }
})

import { computeSubnetBroadcast, normalizeMac, enumerateSenders, wakeNAS } from '../wol.js'

describe('normalizeMac', () => {
  it('accepts colon format', () => {
    expect(normalizeMac('aa:bb:cc:dd:ee:ff')).toBe('AA:BB:CC:DD:EE:FF')
  })
  it('accepts dash format', () => {
    expect(normalizeMac('aa-bb-cc-dd-ee-ff')).toBe('AA:BB:CC:DD:EE:FF')
  })
  it('accepts plain hex', () => {
    expect(normalizeMac('aabbccddeeff')).toBe('AA:BB:CC:DD:EE:FF')
  })
  it('rejects invalid length', () => {
    expect(() => normalizeMac('aa:bb:cc')).toThrow()
  })
})

describe('computeSubnetBroadcast', () => {
  it('handles /24', () => {
    expect(computeSubnetBroadcast('192.168.1.42', '255.255.255.0')).toBe('192.168.1.255')
  })
  it('handles /16', () => {
    expect(computeSubnetBroadcast('10.0.0.5', '255.255.0.0')).toBe('10.0.255.255')
  })
  it('handles /20', () => {
    expect(computeSubnetBroadcast('172.16.5.9', '255.255.240.0')).toBe('172.16.15.255')
  })
  it('handles /8', () => {
    expect(computeSubnetBroadcast('10.1.2.3', '255.0.0.0')).toBe('10.255.255.255')
  })
})

describe('enumerateSenders', () => {
  afterEach(() => { mockIfaces = {} })

  it('filters internal and IPv6, returns one per external IPv4', () => {
    mockIfaces = {
      lo: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', internal: true, mac: '00:00:00:00:00:00', cidr: '127.0.0.0/8' }],
      eth0: [
        { address: '192.168.1.12', netmask: '255.255.255.0', family: 'IPv4', internal: false, mac: 'aa:bb:cc:dd:ee:ff', cidr: '192.168.1.12/24' },
        { address: 'fe80::1', netmask: 'ffff:ffff:ffff:ffff::', family: 'IPv6', internal: false, mac: 'aa:bb:cc:dd:ee:ff', scopeid: 0, cidr: 'fe80::1/64' } as unknown as NetworkInterfaceInfo,
      ],
      eth1: [{ address: '10.0.0.5', netmask: '255.255.0.0', family: 'IPv4', internal: false, mac: 'aa:bb:cc:dd:ee:00', cidr: '10.0.0.5/16' }],
    }

    const senders = enumerateSenders('192.168.1.50')
    expect(senders.map(s => s.iface).sort()).toEqual(['eth0', 'eth1'])
    const eth0 = senders.find(s => s.iface === 'eth0')!
    expect(eth0.destinations).toContain('192.168.1.255')
    expect(eth0.destinations).toContain('255.255.255.255')
    expect(eth0.destinations).toContain('192.168.1.50')
    const eth1 = senders.find(s => s.iface === 'eth1')!
    expect(eth1.destinations).toContain('10.0.255.255')
  })

  it('returns empty when only loopback is available', () => {
    mockIfaces = {
      lo: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', internal: true, mac: '00:00:00:00:00:00', cidr: '127.0.0.0/8' }],
    }
    expect(enumerateSenders()).toEqual([])
  })
})

describe('magic packet format (via loopback dgram)', () => {
  it('sends 6x 0xff followed by 16x MAC to the receiver', async () => {
    // Expose 127.0.0.1 as "non-internal" so wakeNAS binds there.
    mockIfaces = {
      lo0: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', internal: false, mac: '00:00:00:00:00:00', cidr: '127.0.0.0/8' }],
    }

    const receiver = createSocket({ type: 'udp4', reuseAddr: true })
    const received: Buffer[] = []
    receiver.on('message', (msg) => { received.push(msg) })
    await new Promise<void>((resolve) => receiver.bind(0, '127.0.0.1', resolve))
    const port = (receiver.address() as { port: number }).port

    // Temporarily hijack PORTS via module env: we cannot easily, so instead
    // aim the unicast at 127.0.0.1 and rely on receiver listening on `port`.
    // Workaround: send directly using the exported helper is not public;
    // use wakeNAS with wait:false and validate that *some* packet arrives
    // on our receiver by binding it on port 9 (the default).
    receiver.close()

    const r2 = createSocket({ type: 'udp4', reuseAddr: true })
    const got: Buffer[] = []
    r2.on('message', (msg) => { got.push(msg) })
    try {
      await new Promise<void>((resolve, reject) => {
        r2.once('error', reject)
        r2.bind(9, '127.0.0.1', () => resolve())
      })
    } catch {
      // Port 9 may require privileges; skip verification in that case.
      r2.close()
      return
    }

    await wakeNAS({ mac: 'AA:BB:CC:DD:EE:FF', ip: '127.0.0.1', wait: false, timeout: 5000 })
    await new Promise(r => setTimeout(r, 100))
    r2.close()

    expect(got.length).toBeGreaterThan(0)
    const pkt = got[0]!
    expect(pkt.length).toBe(6 + 16 * 6)
    for (let i = 0; i < 6; i++) expect(pkt[i]).toBe(0xff)
    const macBytes = Buffer.from('AABBCCDDEEFF', 'hex')
    for (let rep = 0; rep < 16; rep++) {
      for (let i = 0; i < 6; i++) {
        expect(pkt[6 + rep * 6 + i]).toBe(macBytes[i])
      }
    }
  }, 10000)
})
