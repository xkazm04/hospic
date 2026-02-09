/**
 * GET /api/sets/research/stream?executionId=xxx
 *
 * SSE stream of research execution events.
 * Polls the in-memory execution for new events every 100ms.
 */

import { NextRequest } from 'next/server'
import { getResearchExecution } from '@/lib/cli/research-service'
import type { CLIEvent, SSEEvent } from '@/lib/cli/types'

function convertEvent(executionId: string, cliEvent: CLIEvent): SSEEvent {
  switch (cliEvent.type) {
    case 'init':
      return {
        type: 'connected',
        data: {
          executionId,
          sessionId: cliEvent.data.sessionId,
          model: cliEvent.data.model,
        },
        timestamp: cliEvent.timestamp,
      }
    case 'text':
      return {
        type: 'message',
        data: { content: cliEvent.data.content, model: cliEvent.data.model },
        timestamp: cliEvent.timestamp,
      }
    case 'tool_use':
      return {
        type: 'tool_use',
        data: { toolName: cliEvent.data.name, toolInput: cliEvent.data.input },
        timestamp: cliEvent.timestamp,
      }
    case 'tool_result':
      return {
        type: 'tool_result',
        data: { toolUseId: cliEvent.data.toolUseId, content: cliEvent.data.content },
        timestamp: cliEvent.timestamp,
      }
    case 'result':
      return {
        type: 'result',
        data: {
          sessionId: cliEvent.data.sessionId,
          usage: cliEvent.data.usage,
          durationMs: cliEvent.data.durationMs,
          costUsd: cliEvent.data.costUsd,
        },
        timestamp: cliEvent.timestamp,
      }
    case 'error':
      return {
        type: 'error',
        data: { error: cliEvent.data.message, exitCode: cliEvent.data.exitCode },
        timestamp: cliEvent.timestamp,
      }
    default:
      return { type: 'message', data: cliEvent.data, timestamp: cliEvent.timestamp }
  }
}

export async function GET(request: NextRequest) {
  const executionId = request.nextUrl.searchParams.get('executionId')
  if (!executionId) {
    return new Response('executionId required', { status: 400 })
  }

  const encoder = new TextEncoder()
  let closed = false
  let lastEventIndex = 0

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: SSEEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }

      // Initial connected event
      send({ type: 'connected', data: { executionId }, timestamp: Date.now() })

      let notFoundCount = 0

      const poll = setInterval(() => {
        if (closed) {
          clearInterval(poll)
          return
        }

        const exec = getResearchExecution(executionId)
        if (!exec) {
          notFoundCount++
          if (notFoundCount >= 30) {
            clearInterval(poll)
            send({ type: 'error', data: { error: 'Execution not found' }, timestamp: Date.now() })
            closed = true
            controller.close()
          }
          return
        }
        notFoundCount = 0

        // Send new events
        const newEvents = exec.events.slice(lastEventIndex)
        for (const event of newEvents) {
          send(convertEvent(executionId, event))

          if (event.type === 'result' || event.type === 'error') {
            // Also send the result data if available
            if (exec.result) {
              send({ type: 'result', data: { result: exec.result as unknown as Record<string, unknown> }, timestamp: Date.now() })
            }
            closed = true
            clearInterval(poll)
            controller.close()
            return
          }
        }
        lastEventIndex = exec.events.length

        // Check if execution finished without emitting result/error event
        if (exec.status !== 'running') {
          if (exec.result) {
            send({ type: 'result', data: { result: exec.result as unknown as Record<string, unknown> }, timestamp: Date.now() })
          } else if (exec.error) {
            send({ type: 'error', data: { error: exec.error }, timestamp: Date.now() })
          }
          closed = true
          clearInterval(poll)
          controller.close()
        }
      }, 100)

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat)
          return
        }
        send({ type: 'heartbeat', data: { executionId }, timestamp: Date.now() })
      }, 15_000)

      // Clean up on cancel
      request.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(poll)
        clearInterval(heartbeat)
      })
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
