'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

interface BatchProcessingProps {
  current: number
  total: number
  onCancel: () => void
}

export function BatchProcessing({ current, total, onCancel }: BatchProcessingProps) {
  const t = useTranslations('extraction')
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="px-6 py-8 flex flex-col items-center gap-6">
      <Loader2 className="h-10 w-10 text-accent animate-spin" />

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {t('processing', { current, total })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {percent}%
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-accent h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="border border-border text-foreground py-2 px-6 rounded-md text-sm font-medium hover:bg-muted transition-colors"
      >
        {t('cancelProcessing')}
      </button>
    </div>
  )
}
