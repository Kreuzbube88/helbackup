import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { spawn } from 'child_process'

export interface VmInfo {
  name: string
  state: string
}

function parseVirshList(output: string): VmInfo[] {
  const lines = output.split('\n')
  const vms: VmInfo[] = []

  for (const line of lines) {
    // Skip header lines and separators
    if (!line.trim() || line.trim().startsWith('Id') || line.trim().startsWith('-')) continue

    // Format: " 1     Windows10    running" or " -     Ubuntu-22    shut off"
    const match = line.match(/^\s+[-\d]+\s+(\S+)\s+(.+?)\s*$/)
    if (match) {
      vms.push({ name: match[1], state: match[2].trim() })
    }
  }

  return vms
}

async function listVMs(): Promise<VmInfo[]> {
  return new Promise((resolve, reject) => {
    const virsh = spawn('virsh', ['list', '--all'])
    let stdout = ''
    let stderr = ''

    virsh.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    virsh.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    virsh.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`virsh list failed (code ${code}): ${stderr}`))
        return
      }
      resolve(parseVirshList(stdout))
    })

    virsh.on('error', (err: Error) => reject(err))
  })
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
