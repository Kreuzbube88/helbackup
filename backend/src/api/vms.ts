import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fs from 'fs/promises'
import path from 'path'

export interface VmInfo {
  name: string
}

const LIBVIRT_QEMU_DIR = '/unraid/libvirt/qemu'

async function listVMs(): Promise<VmInfo[]> {
  const entries = await fs.readdir(LIBVIRT_QEMU_DIR)
  const xmlFiles = entries.filter(f => f.endsWith('.xml'))

  const vms: VmInfo[] = []
  for (const file of xmlFiles) {
    try {
      const xml = await fs.readFile(path.join(LIBVIRT_QEMU_DIR, file), 'utf8')
      const match = xml.match(/<name>([^<]+)<\/name>/)
      if (match) {
        vms.push({ name: match[1] })
      }
    } catch {
      // skip unreadable files
    }
  }

  return vms.sort((a, b) => a.name.localeCompare(b.name))
}

export async function vmRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/vms',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const vms = await listVMs()
        return reply.send(vms)
      } catch (error: unknown) {
        app.log.error(error)
        return reply.status(500).send({ error: 'Failed to list VMs' })
      }
    }
  )
}
