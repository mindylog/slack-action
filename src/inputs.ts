import * as core from '@actions/core'
import { z } from 'zod'

export const InputSchema = z.discriminatedUnion('phase', [
  z.object({
    service_name: z.string(),
    channel_id: z.string(),
    group_id: z.string(),
    phase: z.literal('start'),
    environment: z.string(),
    before_ref: z.string()
  }),
  z.object({
    service_name: z.string(),
    channel_id: z.string(),
    group_id: z.string(),
    phase: z.literal('finish'),
    environment: z.string(),
    before_ref: z.string(),
    thread_ts: z.string()
  }),
  z.object({
    service_name: z.string(),
    channel_id: z.string(),
    group_id: z.string(),
    phase: z.literal('failure'),
    environment: z.string(),
    before_ref: z.string(),
    thread_ts: z.string()
  }),
  z.object({
    service_name: z.string(),
    channel_id: z.string(),
    group_id: z.string(),
    phase: z.literal('cancelled'),
    environment: z.string(),
    before_ref: z.string(),
    thread_ts: z.string()
  })
])

export function getEnvVariable(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Env variable ${name} is missing.`)
  }
  return value
}

export function parseInputs() {
  return InputSchema.parse({
    service_name: core.getInput('service_name', { required: true }),
    channel_id: core.getInput('channel_id', { required: true }),
    group_id: core.getInput('group_id', { required: true }),
    phase: core.getInput('phase', { required: true }),
    environment: core.getInput('environment', { required: true }),
    before_ref: core.getInput('before_ref', { required: true }),
    thread_ts: core.getInput('thread_ts')
  })
}
