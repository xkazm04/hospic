/**
 * POST /api/sets/research — Start a set decomposition research execution.
 * GET  /api/sets/research?executionId=xxx — Check execution status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { startResearch, getResearchExecution } from '@/lib/cli/research-service'
import { buildResearchPrompt } from '@/lib/cli/research-prompt'
import type { SetGroupEntry, SetMatchedProduct } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      groupCode: string
      entries: SetGroupEntry[]
      matchedProducts: SetMatchedProduct[]
    }

    const { groupCode, entries, matchedProducts } = body

    if (!groupCode || !entries?.length) {
      return NextResponse.json({ error: 'groupCode and entries are required' }, { status: 400 })
    }

    // Build the research prompt
    const prompt = buildResearchPrompt(groupCode, entries, matchedProducts)

    // Start CLI execution
    const executionId = startResearch(groupCode, prompt)

    return NextResponse.json({
      executionId,
      streamUrl: `/api/sets/research/stream?executionId=${executionId}`,
    })
  } catch (error) {
    console.error('Research start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start research' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const executionId = request.nextUrl.searchParams.get('executionId')
  if (!executionId) {
    return NextResponse.json({ error: 'executionId required' }, { status: 400 })
  }

  const execution = getResearchExecution(executionId)
  if (!execution) {
    return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: execution.id,
    groupCode: execution.groupCode,
    status: execution.status,
    result: execution.result,
    error: execution.error,
    eventCount: execution.events.length,
    startedAt: execution.startedAt,
    endedAt: execution.endedAt,
  })
}
