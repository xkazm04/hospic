/**
 * Types for Claude CLI set decomposition research.
 */

// ─── CLI Stream-JSON Message Types ───

export interface CLISystemMessage {
  type: 'system'
  subtype: 'init'
  session_id: string
  tools: string[]
  model?: string
}

export interface CLIAssistantMessage {
  type: 'assistant'
  message: {
    id: string
    type: 'message'
    role: 'assistant'
    content: Array<{
      type: 'text' | 'tool_use'
      text?: string
      id?: string
      name?: string
      input?: Record<string, unknown>
    }>
    model: string
    stop_reason: string
    usage?: { input_tokens: number; output_tokens: number }
  }
}

export interface CLIUserMessage {
  type: 'user'
  message: {
    role: 'user'
    content: Array<{
      type: 'tool_result'
      tool_use_id: string
      content: string
    }>
  }
}

export interface CLIResultMessage {
  type: 'result'
  subtype?: string
  result?: {
    usage?: { input_tokens: number; output_tokens: number }
    session_id?: string
  }
  duration_ms?: number
  cost_usd?: number
  is_error?: boolean
}

export type CLIMessage = CLISystemMessage | CLIAssistantMessage | CLIUserMessage | CLIResultMessage

// ─── Execution Events ───

export interface CLIEvent {
  type: 'init' | 'text' | 'tool_use' | 'tool_result' | 'result' | 'error'
  data: Record<string, unknown>
  timestamp: number
}

export interface ResearchExecution {
  id: string
  groupCode: string
  status: 'running' | 'completed' | 'failed'
  events: CLIEvent[]
  result: ComponentDecomposition | null
  error: string | null
  startedAt: number
  endedAt?: number
}

// ─── Decomposition Output ───

export interface ComponentDecomposition {
  source: {
    xc_subcode: string
    price_eur: number
    price_scope: 'set' | 'procedure'
    description: string | null
    manufacturer_name: string | null
    source_country: string
  }
  components: ExtractedComponent[]
  procedure_cost: ProcedureCost | null
  validation: ValidationChecklist
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

export type EvidenceType =
  | 'catalog_product_price'   // matched catalog product converted to EUR
  | 'component_reference'     // existing component-scoped reference price
  | 'web_source'              // published reimbursement catalog found via search
  | 'fraction_estimate'       // estimated from known fraction ranges
  | 'cross_manufacturer'      // triangulated from other manufacturers in group

export interface ExtractedComponent {
  component_type: string
  emdn_code: string | null
  description: string
  estimated_price_eur: number
  price_range: { min: number; max: number } | null  // from multi-entry triangulation
  fraction_of_set: number
  confidence: 'high' | 'medium' | 'low'
  evidence_type: EvidenceType
  evidence_source: string        // specific source: product name, URL, ref price ID, etc.
  reasoning: string
}

export interface ProcedureCost {
  implant_total_eur: number
  procedure_only_eur: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export interface ValidationChecklist {
  fractions_sum_to_one: boolean
  no_component_exceeds_50pct: boolean
  catalog_match_within_30pct: boolean | null  // null = no catalog products to check
  clinically_complete: boolean                // all expected components present
  notes: string                               // any warnings or observations
}

// ─── SSE Event Types ───

export interface SSEEvent {
  type: 'connected' | 'message' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'heartbeat'
  data: Record<string, unknown>
  timestamp: number
}
