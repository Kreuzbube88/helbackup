import { Pool } from 'undici'

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
