import type { JobExecutionEngine } from './engine.js'

// Shared store of in-flight executions — used by both execution.ts and logs.ts
export const activeExecutions = new Map<string, JobExecutionEngine>()
