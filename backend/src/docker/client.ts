import { Pool } from 'undici'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'

const dockerPool = new Pool('http://localhost', {
  socketPath: '/var/run/docker.sock',
  keepAliveTimeout: 10000,
  keepAliveMaxTimeout: 20000,
})

export interface Container {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
}

export interface ContainerInspect {
  Id: string
  Name: string
  Config: {
    Image: string
    Env: string[]
    Labels: Record<string, string>
  }
  HostConfig: {
    Binds: string[] | null
    PortBindings: Record<string, unknown>
    NetworkMode: string
  }
  NetworkSettings: {
    Networks: Record<string, unknown>
  }
}

export async function listContainers(): Promise<Container[]> {
  const { statusCode, body } = await dockerPool.request({
    path: '/containers/json?all=1',
    method: 'GET',
  })
  if (statusCode !== 200) throw new Error(`Docker API error: ${statusCode}`)
  return (await body.json()) as Container[]
}

export async function inspectContainer(id: string): Promise<ContainerInspect> {
  const { statusCode, body } = await dockerPool.request({
    path: `/containers/${encodeURIComponent(id)}/json`,
    method: 'GET',
  })
  if (statusCode !== 200) throw new Error(`Docker API error: ${statusCode}`)
  return (await body.json()) as ContainerInspect
}

export async function stopContainer(id: string): Promise<void> {
  const { statusCode } = await dockerPool.request({
    path: `/containers/${encodeURIComponent(id)}/stop`,
    method: 'POST',
  })
  if (statusCode !== 204 && statusCode !== 304) {
    throw new Error(`Failed to stop container: ${statusCode}`)
  }
}

export async function startContainer(id: string): Promise<void> {
  const { statusCode } = await dockerPool.request({
    path: `/containers/${encodeURIComponent(id)}/start`,
    method: 'POST',
  })
  if (statusCode !== 204 && statusCode !== 304) {
    throw new Error(`Failed to start container: ${statusCode}`)
  }
}

export interface DockerImage {
  Id: string
  RepoTags: string[] | null
}

export async function listImages(): Promise<DockerImage[]> {
  const { statusCode, body } = await dockerPool.request({
    path: '/images/json',
    method: 'GET',
  })
  if (statusCode !== 200) throw new Error(`Docker API error: ${statusCode}`)
  return (await body.json()) as DockerImage[]
}

export async function saveImage(imageName: string, destFile: string): Promise<void> {
  const { pipeline } = await import('node:stream/promises')
  const { createWriteStream } = await import('node:fs')
  const { statusCode, body } = await dockerPool.request({
    path: `/images/${encodeURIComponent(imageName)}/get`,
    method: 'GET',
  })
  if (statusCode !== 200) throw new Error(`Docker API error saving image: ${statusCode}`)
  await pipeline(body, createWriteStream(destFile))
}

/** Shared core: create + start a Docker exec and return the raw multiplexed stream + execId. */
async function dockerExecCore(
  containerId: string,
  cmd: string[],
  env?: string[]
): Promise<{ rawStream: Readable; execId: string }> {
  const createRes = await dockerPool.request({
    path: `/containers/${encodeURIComponent(containerId)}/exec`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ AttachStdout: true, AttachStderr: true, Cmd: cmd, ...(env ? { Env: env } : {}) }),
  })
  if (createRes.statusCode !== 201) {
    const errBody = await createRes.body.text()
    throw new Error(`Docker exec create failed (${createRes.statusCode}): ${errBody}`)
  }
  const { Id: execId } = (await createRes.body.json()) as { Id: string }

  // Start exec — returns multiplexed stdout/stderr stream
  const startRes = await dockerPool.request({
    path: `/exec/${encodeURIComponent(execId)}/start`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ Detach: false, Tty: false }),
  })
  if (startRes.statusCode !== 200) {
    const errBody = await startRes.body.text()
    throw new Error(`Docker exec start failed (${startRes.statusCode}): ${errBody}`)
  }

  // undici BodyReadable is already a Node.js Readable — cast directly, never use Readable.fromWeb
  return { rawStream: startRes.body as unknown as Readable, execId }
}

/** Fetch exit code after exec stream has ended. */
async function dockerExecExitCode(execId: string): Promise<number> {
  const inspectRes = await dockerPool.request({ path: `/exec/${encodeURIComponent(execId)}/json`, method: 'GET' })
  const { ExitCode } = (await inspectRes.body.json()) as { ExitCode: number }
  return ExitCode
}

export async function dockerExecToFile(
  containerId: string,
  cmd: string[],
  destFile: string,
  env?: string[]
): Promise<{ stderr: string; exitCode: number }> {
  const { rawStream, execId } = await dockerExecCore(containerId, cmd, env)

  // Demux: 8-byte frame header [streamType(1B), 0,0,0, payloadSize(4B big-endian)] + payload
  // streamType 1 = stdout, 2 = stderr
  const writeStream = createWriteStream(destFile)
  const stderrChunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    let carry = Buffer.alloc(0)
    rawStream.on('data', (chunk: Buffer) => {
      let buf = Buffer.concat([carry, chunk])
      while (buf.length >= 8) {
        const streamType = buf[0]
        const frameSize = buf.readUInt32BE(4)
        if (buf.length < 8 + frameSize) break
        const payload = buf.subarray(8, 8 + frameSize)
        if (streamType === 1) writeStream.write(payload)
        else if (streamType === 2) stderrChunks.push(payload)
        buf = buf.subarray(8 + frameSize)
      }
      carry = buf
    })
    rawStream.on('end', () => { writeStream.end(); resolve() })
    rawStream.on('error', reject)
    writeStream.on('error', reject)
  })

  return { stderr: Buffer.concat(stderrChunks).toString('utf8'), exitCode: await dockerExecExitCode(execId) }
}

/** Like dockerExecToFile but returns stdout as a string instead of writing to disk. */
export async function dockerExecToString(
  containerId: string,
  cmd: string[],
  env?: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { rawStream, execId } = await dockerExecCore(containerId, cmd, env)

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    let carry = Buffer.alloc(0)
    rawStream.on('data', (chunk: Buffer) => {
      let buf = Buffer.concat([carry, chunk])
      while (buf.length >= 8) {
        const streamType = buf[0]
        const frameSize = buf.readUInt32BE(4)
        if (buf.length < 8 + frameSize) break
        const payload = buf.subarray(8, 8 + frameSize)
        if (streamType === 1) stdoutChunks.push(payload)
        else if (streamType === 2) stderrChunks.push(payload)
        buf = buf.subarray(8 + frameSize)
      }
      carry = buf
    })
    rawStream.on('end', resolve)
    rawStream.on('error', reject)
  })

  return {
    stdout: Buffer.concat(stdoutChunks).toString('utf8'),
    stderr: Buffer.concat(stderrChunks).toString('utf8'),
    exitCode: await dockerExecExitCode(execId),
  }
}

export async function closeDockerPool(): Promise<void> {
  await dockerPool.close()
}

export async function getContainerArchive(
  containerId: string,
  containerPath: string
): Promise<Readable> {
  const { statusCode, body } = await dockerPool.request({
    path: `/containers/${encodeURIComponent(containerId)}/archive?path=${encodeURIComponent(containerPath)}`,
    method: 'GET',
  })
  if (statusCode !== 200) throw new Error(`Docker archive failed: ${statusCode}`)
  return body as unknown as Readable
}
