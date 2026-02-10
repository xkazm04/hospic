'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink, ShieldCheck, FileText } from 'lucide-react'
import type { BatchRow, BatchFilterStatus } from '@/lib/types/batch-import'

const PAGE_SIZE = 15

interface BatchResultsTableProps {
  rows: BatchRow[]
  onReviewRow: (row: BatchRow) => void
  onDelete?: () => void
}

function StatusIcon({ status }: { status: BatchRow['status'] }) {
  switch (status) {
    case 'accepted':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'skipped':
      return <XCircle className="h-4 w-4 text-muted-foreground" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-amber-500" />
  }
}

function EmdnSourceIcon({ source }: { source: string | null | undefined }) {
  const t = useTranslations('extraction')
  if (source === 'eudamed') {
    return (
      <span title={t('emdnSourceEudamed')}>
        <ShieldCheck className="inline h-3.5 w-3.5 text-blue-600 ml-1" />
      </span>
    )
  }
  if (source === 'document') {
    return (
      <span title={t('emdnSourceDocument')}>
        <FileText className="inline h-3.5 w-3.5 text-green-600 ml-1" />
      </span>
    )
  }
  return null
}

const FILTER_TABS: BatchFilterStatus[] = ['all', 'extracted', 'accepted', 'skipped', 'error']

export function BatchResultsTable({ rows, onReviewRow, onDelete }: BatchResultsTableProps) {
  const t = useTranslations('extraction')
  const [filter, setFilter] = useState<BatchFilterStatus>('all')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'extracted') return rows.filter((r) => r.status === 'extracted' || r.status === 'pending')
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const counts = useMemo(() => ({
    accepted: rows.filter((r) => r.status === 'accepted').length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
    pending: rows.filter((r) => r.status === 'extracted' || r.status === 'pending').length,
    error: rows.filter((r) => r.status === 'error').length,
  }), [rows])

  function filterLabel(f: BatchFilterStatus) {
    switch (f) {
      case 'all': return t('filterAll')
      case 'extracted': return t('filterPending')
      case 'accepted': return t('filterAccepted')
      case 'skipped': return t('filterSkipped')
      case 'error': return t('filterError')
    }
  }

  function filterCount(f: BatchFilterStatus) {
    switch (f) {
      case 'all': return rows.length
      case 'extracted': return counts.pending
      case 'accepted': return counts.accepted
      case 'skipped': return counts.skipped
      case 'error': return counts.error
    }
  }

  return (
    <div className="px-6 space-y-4">
      {/* Summary */}
      <p className="text-sm text-muted-foreground">
        {t('batchSummary', {
          accepted: counts.accepted,
          skipped: counts.skipped,
          pending: counts.pending,
        })}
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {FILTER_TABS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setPage(0) }}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === f
                ? 'bg-accent/10 text-accent'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {filterLabel(f)} ({filterCount(f)})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-10">#</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('productName')}</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">{t('emdnCode')}</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10" title="URL">
                <ExternalLink className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              </th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground w-14">{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const clickable = row.status === 'extracted' || row.status === 'accepted' || row.status === 'skipped'
              const productUrl = row.extracted?.product_url
              return (
                <tr
                  key={row.id}
                  onClick={clickable ? () => onReviewRow(row) : undefined}
                  className={`border-t border-border ${
                    clickable ? 'cursor-pointer hover:bg-muted/30' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-muted-foreground">{row.rowIndex + 1}</td>
                  <td className="px-3 py-2 truncate max-w-[180px]">
                    {row.extracted?.name || Object.values(row.rawData)[0] || '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs font-mono whitespace-nowrap">
                    {row.extracted?.suggested_emdn || '—'}
                    <EmdnSourceIcon source={row.extracted?.emdn_source} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {productUrl ? (
                      <a
                        href={productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={productUrl}
                        className="text-accent hover:text-accent/80"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mx-auto" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusIcon status={row.status} />
                  </td>
                </tr>
              )
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  {t('noRowsToProcess')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: Pagination + Delete */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="px-2.5 py-1 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            {t('deleteBatch')}
          </button>
        ) : (
          <div />
        )}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 rounded hover:bg-muted disabled:opacity-40"
            >
              &larr; Prev
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded hover:bg-muted disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
