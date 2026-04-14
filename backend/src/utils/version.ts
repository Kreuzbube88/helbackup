import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('../../package.json') as { version: string }

export const APP_VERSION: string = pkg.version
