/**
 * Claude CLI Research Service — Single-shot set decomposition.
 *
 * Spawns Claude Code CLI, sends a research prompt via stdin,
 * parses stream-json output, and extracts the JSON result.
 *
 * Adapted from Vibeman's cli-service.ts — simplified for single-shot use.
 */

import { spawn, type ChildProcess } from 'child_process'
import type {
  CLIMessage,
  CLIAssistantMessage,
  CLIEvent,
  ResearchExecution,
  ComponentDecomposition,
} from './types'

// Persist across Next.js HMR in dev mode
const g = globalThis as unknown as {
  __researchExecutions?: Map<string, ResearchExecution>
}
const executions = (g.__researchExecutions ??= new Map<string, ResearchExecution>())

// ─── JSON Parsing ───

function parseStreamJsonLine(line: string): CLIMessage | null {
  try {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('[')) return null
    return JSON.parse(trimmed) as CLIMessage
  } catch {
    return null
  }
}

function extractTextContent(msg: CLIAssistantMessage): string {
  return msg.message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('\n')
}

function extractToolUses(msg: CLIAssistantMessage) {
  return msg.message.content
    .filter((c) => c.type === 'tool_use')
    .map((c) => ({ id: c.id || '', name: c.name || '', input: c.input || {} }))
}

/**
 * Extract JSON block from the last assistant text message.
 * Looks for ```json ... ``` code fences, falling back to raw JSON parse.
 */
function extractJsonResult(events: CLIEvent[]): ComponentDecomposition | null {
  // Gather all text events in reverse (last message first)
  const textEvents = events.filter((e) => e.type === 'text').reverse()

  for (const event of textEvents) {
    const content = String(event.data.content || '')

    // Try fenced JSON block
    const fenceMatch = content.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1]) as ComponentDecomposition
      } catch {
        // continue
      }
    }

    // Try raw JSON (entire content is JSON)
    const trimmed = content.trim()
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as ComponentDecomposition
      } catch {
        // continue
      }
    }
  }

  return null
}

// ─── Execution Management ───

export function startResearch(groupCode: string, prompt: string): string {
  const id = `research-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const execution: ResearchExecution = {
    id,
    groupCode,
    status: 'running',
    events: [],
    result: null,
    error: null,
    startedAt: Date.now(),
  }
  executions.set(id, execution)

  const emit = (event: CLIEvent) => {
    execution.events.push(event)
  }

  // Spawn CLI
  const isWindows = process.platform === 'win32'
  const command = isWindows ? 'claude.cmd' : 'claude'
  const args = ['-p', '-', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions']

  let child: ChildProcess
  try {
    child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
    })
  } catch (err) {
    execution.status = 'failed'
    execution.error = err instanceof Error ? err.message : 'Failed to spawn CLI'
    execution.endedAt = Date.now()
    emit({ type: 'error', data: { message: execution.error }, timestamp: Date.now() })
    return id
  }

  // Send prompt via stdin
  child.stdin!.write(prompt)
  child.stdin!.end()

  // Line-buffered JSON parsing
  let lineBuffer = ''

  const processLine = (line: string) => {
    const parsed = parseStreamJsonLine(line)
    if (!parsed) return

    if (parsed.type === 'system' && parsed.subtype === 'init') {
      emit({
        type: 'init',
        data: { sessionId: parsed.session_id, model: parsed.model, tools: parsed.tools },
        timestamp: Date.now(),
      })
    } else if (parsed.type === 'assistant') {
      const text = extractTextContent(parsed)
      if (text) {
        emit({ type: 'text', data: { content: text, model: parsed.message.model }, timestamp: Date.now() })
      }
      for (const tool of extractToolUses(parsed)) {
        emit({ type: 'tool_use', data: { id: tool.id, name: tool.name, input: tool.input }, timestamp: Date.now() })
      }
    } else if (parsed.type === 'user') {
      const results = parsed.message.content.filter((c) => c.type === 'tool_result')
      for (const r of results) {
        emit({ type: 'tool_result', data: { toolUseId: r.tool_use_id, content: r.content }, timestamp: Date.now() })
      }
    } else if (parsed.type === 'result') {
      emit({
        type: 'result',
        data: {
          sessionId: parsed.result?.session_id,
          usage: parsed.result?.usage,
          durationMs: parsed.duration_ms,
          costUsd: parsed.cost_usd,
          isError: parsed.is_error,
        },
        timestamp: Date.now(),
      })
    }
  }

  child.stdout!.on('data', (data: Buffer) => {
    lineBuffer += data.toString()
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''
    for (const line of lines) processLine(line)
  })

  child.stderr!.on('data', () => {
    // Ignore stderr (CLI debug output)
  })

  child.on('close', (code: number | null) => {
    // Flush remaining buffer
    if (lineBuffer.trim()) {
      processLine(lineBuffer)
      lineBuffer = ''
    }

    execution.endedAt = Date.now()

    if (code !== 0 && code !== null) {
      execution.status = 'failed'
      execution.error = `Process exited with code ${code}`
      emit({ type: 'error', data: { exitCode: code, message: execution.error }, timestamp: Date.now() })
      return
    }

    // Extract JSON result from assistant messages
    const result = extractJsonResult(execution.events)
    if (result) {
      execution.result = result
      execution.status = 'completed'
    } else {
      execution.status = 'failed'
      execution.error = 'No valid JSON result found in assistant output'
      emit({ type: 'error', data: { message: execution.error }, timestamp: Date.now() })
    }
  })

  child.on('error', (err: Error) => {
    execution.endedAt = Date.now()
    execution.status = 'failed'
    execution.error = err.message
    emit({ type: 'error', data: { message: err.message }, timestamp: Date.now() })
  })

  // 5-minute timeout
  const timeout = setTimeout(() => {
    if (!child.killed) {
      child.kill()
      execution.status = 'failed'
      execution.error = 'Execution timed out after 5 minutes'
      emit({ type: 'error', data: { message: execution.error }, timestamp: Date.now() })
    }
  }, 300_000)

  child.on('close', () => clearTimeout(timeout))

  return id
}

export function getResearchExecution(id: string): ResearchExecution | undefined {
  return executions.get(id)
}

export function abortResearch(id: string): boolean {
  const exec = executions.get(id)
  if (!exec || exec.status !== 'running') return false
  // We don't keep the process reference — rely on timeout or natural completion
  exec.status = 'failed'
  exec.error = 'Aborted by user'
  exec.endedAt = Date.now()
  return true
}

/** Clean up old executions (default: 1 hour) */
export function cleanupResearchExecutions(maxAgeMs = 3_600_000) {
  const now = Date.now()
  for (const [id, exec] of executions) {
    if (exec.status !== 'running' && exec.endedAt && now - exec.endedAt > maxAgeMs) {
      executions.delete(id)
    }
  }
}
