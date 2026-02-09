'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { X, Loader2, Check, AlertTriangle, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react'
import { formatPriceWithCurrency } from '@/lib/utils/format-price'
import type { SetGroupEntry, SetMatchedProduct } from '@/lib/types'
import type { ComponentDecomposition, ExtractedComponent, SSEEvent, ValidationChecklist, EvidenceType } from '@/lib/cli/types'

interface ResearchModalProps {
  groupCode: string
  entries: SetGroupEntry[]
  matchedProducts: SetMatchedProduct[]
  onAccept: (result: ComponentDecomposition) => void
  onClose: () => void
}

interface LogEntry {
  type: 'info' | 'tool' | 'text' | 'error'
  message: string
  timestamp: number
}

function getEvidenceLabel(type: EvidenceType, t: ReturnType<typeof useTranslations>) {
  const labels: Record<EvidenceType, { label: string; color: string }> = {
    catalog_product_price: { label: t('research.evidence.catalog'), color: 'bg-green-100 text-green-700' },
    component_reference: { label: t('research.evidence.refPrice'), color: 'bg-blue-100 text-blue-700' },
    web_source: { label: t('research.evidence.web'), color: 'bg-purple-100 text-purple-700' },
    cross_manufacturer: { label: t('research.evidence.crossMfr'), color: 'bg-amber-100 text-amber-700' },
    fraction_estimate: { label: t('research.evidence.estimate'), color: 'bg-gray-100 text-gray-600' },
  }
  return labels[type]
}

export function ResearchModal({
  groupCode,
  entries,
  matchedProducts,
  onAccept,
  onClose,
}: ResearchModalProps) {
  const locale = useLocale()
  const t = useTranslations()
  const [status, setStatus] = useState<'starting' | 'running' | 'completed' | 'failed'>('starting')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [result, setResult] = useState<ComponentDecomposition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const hasStartedRef = useRef(false)

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry])
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Start research on mount
  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const startResearch = async () => {
      addLog({ type: 'info', message: t('research.startingResearch', { code: groupCode }), timestamp: Date.now() })

      try {
        const res = await fetch('/api/sets/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupCode, entries, matchedProducts }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to start research')
        }

        const { executionId, streamUrl } = await res.json()
        addLog({ type: 'info', message: t('research.executionStarted', { id: executionId }), timestamp: Date.now() })
        setStatus('running')

        const eventSource = new EventSource(streamUrl)
        eventSourceRef.current = eventSource

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as SSEEvent

            switch (data.type) {
              case 'connected':
                addLog({ type: 'info', message: t('research.connectedToClaude', { model: (data.data.model as string) || '' }), timestamp: data.timestamp })
                break

              case 'message': {
                const content = String(data.data.content || '')
                const preview = content.length > 200 ? content.slice(0, 200) + '...' : content
                addLog({ type: 'text', message: preview, timestamp: data.timestamp })
                break
              }

              case 'tool_use':
                addLog({
                  type: 'tool',
                  message: t('research.usingTool', { name: data.data.toolName as string }),
                  timestamp: data.timestamp,
                })
                break

              case 'tool_result':
                addLog({
                  type: 'tool',
                  message: t('research.toolResult'),
                  timestamp: data.timestamp,
                })
                break

              case 'result': {
                const resultData = data.data.result as ComponentDecomposition | undefined
                if (resultData?.components) {
                  setResult(resultData)
                  setStatus('completed')
                } else {
                  pollForResult(executionId)
                }
                eventSource.close()
                break
              }

              case 'error':
                setError(String(data.data.error || t('research.unknown')))
                setStatus('failed')
                addLog({ type: 'error', message: String(data.data.error || t('research.failed')), timestamp: data.timestamp })
                eventSource.close()
                break

              case 'heartbeat':
                break
            }
          } catch {
            // Ignore parse errors
          }
        }

        eventSource.onerror = () => {
          eventSource.close()
          pollForResult(executionId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('research.failedToStart'))
        setStatus('failed')
        addLog({ type: 'error', message: err instanceof Error ? err.message : t('research.failedToStart'), timestamp: Date.now() })
      }
    }

    const pollForResult = async (executionId: string) => {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        try {
          const res = await fetch(`/api/sets/research?executionId=${executionId}`)
          if (!res.ok) continue
          const data = await res.json()
          if (data.status === 'completed' && data.result) {
            setResult(data.result)
            setStatus('completed')
            return
          }
          if (data.status === 'failed') {
            setError(data.error || t('research.failed'))
            setStatus('failed')
            return
          }
        } catch {
          // Continue polling
        }
      }
      setError(t('research.timedOut'))
      setStatus('failed')
    }

    startResearch()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [groupCode, entries, matchedProducts, addLog])

  // Primary entry for display
  const primary = [...entries].sort((a, b) => b.price_eur - a.price_eur)[0]

  // Validate component sum
  const componentSum = result?.components.reduce((s, c) => s + c.estimated_price_eur, 0) ?? 0
  const procedureExtra = result?.procedure_cost?.procedure_only_eur ?? 0
  const totalSum = componentSum + procedureExtra
  const expectedTotal = primary?.price_eur ?? 0
  const sumDiffPct = expectedTotal > 0 ? Math.abs(totalSum - expectedTotal) / expectedTotal : 0
  const sumOk = sumDiffPct < 0.05

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-background rounded-xl shadow-2xl border border-border/80 w-full max-w-[720px] max-h-[88vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold flex items-center gap-2.5">
              {status === 'running' || status === 'starting' ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              ) : status === 'completed' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
              {t('research.modalTitle')} <span className="font-mono text-purple-700">{groupCode}</span>
            </h2>
            {primary && (
              <p className="text-xs text-muted-foreground mt-1">
                {primary.component_description || t('research.set')} — {formatPriceWithCurrency(primary.price_eur, 'EUR', locale)}
                {' '}— {primary.price_scope || 'set'} — {primary.manufacturer_name || t('research.unknown')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Running state */}
          {(status === 'starting' || status === 'running') && (
            <div className="p-5">
              <div className="bg-muted/30 rounded-lg border border-border/40 p-4 max-h-[340px] overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5">
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-2.5 ${log.type === 'error' ? 'text-red-500' : log.type === 'tool' ? 'text-blue-600' : log.type === 'text' ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                    <span className="shrink-0 w-4 text-center opacity-60">
                      {log.type === 'tool' ? '>' : log.type === 'error' ? '!' : log.type === 'text' ? '#' : '-'}
                    </span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* Error state */}
          {status === 'failed' && (
            <div className="p-5">
              <div className="bg-red-50 border border-red-200/80 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">{t('research.failed')}</p>
                <p className="text-xs text-red-600 mt-1.5 leading-relaxed">{error}</p>
              </div>
              {logs.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">{t('research.showLogs', { count: logs.length })}</summary>
                  <div className="bg-muted/30 rounded-lg border border-border/40 p-3 mt-2 max-h-[200px] overflow-y-auto font-mono text-[11px] space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="text-muted-foreground">{log.message}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Results state */}
          {status === 'completed' && result && (
            <div className="p-5 space-y-5">
              {/* Components table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{t('research.components.title', { count: result.components.length })}</h3>
                  <ConfidenceIndicator level={result.confidence} showLabel t={t} />
                </div>
                <div className="border border-border/60 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border/60">
                        <th className="px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('research.components.component')}</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('research.components.evidence')}</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('research.components.price')}</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('research.components.percent')}</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('research.components.confidence')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.components.map((comp: ExtractedComponent, i: number) => (
                        <tr key={i} className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-foreground">{comp.description}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {comp.emdn_code && (
                                <span className="font-mono text-[9px] text-muted-foreground bg-muted/60 px-1 py-0.5 rounded">{comp.emdn_code}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{comp.component_type}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <EvidenceBadge type={comp.evidence_type} t={t} />
                            <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={comp.evidence_source}>
                              {comp.evidence_source}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="tabular-nums font-semibold">
                              {formatPriceWithCurrency(comp.estimated_price_eur, 'EUR', locale)}
                            </div>
                            {comp.price_range && (
                              <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                                {formatPriceWithCurrency(comp.price_range.min, 'EUR', locale)} – {formatPriceWithCurrency(comp.price_range.max, 'EUR', locale)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {Math.round(comp.fraction_of_set * 100)}%
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <ConfidenceIndicator level={comp.confidence} t={t} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/40 font-semibold border-t border-border/60">
                        <td className="px-3 py-2.5" colSpan={2}>{t('research.components.total')}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatPriceWithCurrency(componentSum, 'EUR', locale)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {expectedTotal > 0 ? `${Math.round((componentSum / expectedTotal) * 100)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {sumOk ? (
                            <span className="text-green-600 font-mono text-[11px]">{t('research.components.ok')}</span>
                          ) : (
                            <span className="text-amber-500 font-mono text-[11px]" title={t('research.components.offBy', { percent: Math.round(sumDiffPct * 100) })}>
                              ~{Math.round(sumDiffPct * 100)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Procedure cost */}
              {result.procedure_cost && (
                <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-blue-800">{t('research.procedure.title')}</h4>
                  <div className="mt-2 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-blue-700">{t('research.procedure.implantTotal')}</span>
                      <span className="font-semibold tabular-nums">{formatPriceWithCurrency(result.procedure_cost.implant_total_eur, 'EUR', locale)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">{t('research.procedure.procedureOnly')}</span>
                      <span className="font-semibold tabular-nums">{formatPriceWithCurrency(result.procedure_cost.procedure_only_eur, 'EUR', locale)}</span>
                    </div>
                    <p className="text-[10px] text-blue-600/80 mt-1">{result.procedure_cost.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Validation checklist */}
              {result.validation && (
                <ValidationPanel validation={result.validation} t={t} />
              )}

              {/* Reasoning */}
              <div className="bg-muted/20 border border-border/40 rounded-lg p-4">
                <h4 className="text-xs font-semibold mb-1.5">{t('research.reasoning')}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.reasoning}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border bg-muted/20">
          {status === 'completed' && result && (
            <button
              onClick={() => onAccept(result)}
              className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              {t('research.actions.acceptAndSave')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {status === 'completed' ? t('research.actions.close') : t('research.actions.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───

function EvidenceBadge({ type, t }: { type: EvidenceType | undefined; t: ReturnType<typeof useTranslations> }) {
  const info = type ? getEvidenceLabel(type, t) : null
  if (!info) {
    return <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{t('research.evidence.unknown')}</span>
  }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${info.color}`}>
      {type === 'web_source' && <ExternalLink className="w-2.5 h-2.5" />}
      {info.label}
    </span>
  )
}

function ValidationPanel({ validation, t }: { validation: ValidationChecklist; t: ReturnType<typeof useTranslations> }) {
  const checks = [
    { label: t('research.validation.fractionsSumToOne'), passed: validation.fractions_sum_to_one },
    { label: t('research.validation.noComponentExceeds'), passed: validation.no_component_exceeds_50pct },
    { label: t('research.validation.catalogPriceMatch'), passed: validation.catalog_match_within_30pct },
    { label: t('research.validation.clinicallyComplete'), passed: validation.clinically_complete },
  ]

  const allPassed = checks.every((c) => c.passed === true || c.passed === null)

  return (
    <div className={`border rounded-lg p-4 ${allPassed ? 'bg-green-50/40 border-green-200/60' : 'bg-amber-50/40 border-amber-200/60'}`}>
      <div className="flex items-center gap-2 mb-2.5">
        {allPassed ? (
          <ShieldCheck className="w-4 h-4 text-green-600" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-amber-600" />
        )}
        <h4 className="text-xs font-semibold">{allPassed ? t('research.validation.passed') : t('research.validation.warnings')}</h4>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-[11px]">
            {check.passed === null ? (
              <span className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-500">—</span>
            ) : check.passed ? (
              <span className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white">&#10003;</span>
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[8px] text-white">!</span>
            )}
            <span className={check.passed === false ? 'text-amber-700 font-medium' : 'text-muted-foreground'}>{check.label}</span>
          </div>
        ))}
      </div>
      {validation.notes && (
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{validation.notes}</p>
      )}
    </div>
  )
}

function ConfidenceIndicator({ level, showLabel = false, t }: { level: 'high' | 'medium' | 'low'; showLabel?: boolean; t: ReturnType<typeof useTranslations> }) {
  const dots = level === 'high' ? 3 : level === 'medium' ? 2 : 1
  const color = level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-blue-500' : 'bg-amber-400'
  const label = level === 'high' ? t('research.confidence.high') : level === 'medium' ? t('research.confidence.medium') : t('research.confidence.low')

  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <span className="inline-flex items-center gap-[2px]">
        {[1, 2, 3].map((d) => (
          <span key={d} className={`inline-block w-[5px] h-[5px] rounded-full ${d <= dots ? color : 'bg-border'}`} />
        ))}
      </span>
      {showLabel && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </span>
  )
}
