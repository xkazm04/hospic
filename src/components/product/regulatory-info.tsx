'use client'

import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface RegulatoryInfoProps {
  udiDi: string | null
  ceMarked: boolean
  mdrClass: 'I' | 'IIa' | 'IIb' | 'III' | null
}

const MDR_CLASS_DESCRIPTIONS: Record<string, string> = {
  'I': 'Low risk - Basic devices',
  'IIa': 'Low to medium risk - Short-term invasive',
  'IIb': 'Medium to high risk - Long-term invasive',
  'III': 'High risk - Critical devices',
}

export function RegulatoryInfo({ udiDi, ceMarked, mdrClass }: RegulatoryInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
        Regulatory Information
      </h3>

      {/* UDI-DI */}
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-accent mt-0.5" />
        <div>
          <p className="text-sm font-medium">UDI-DI</p>
          <p className="text-sm text-muted-foreground">
            {udiDi || 'Not registered'}
          </p>
        </div>
      </div>

      {/* CE Marking */}
      <div className="flex items-start gap-3">
        {ceMarked ? (
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-medium">CE Marking</p>
          <p className="text-sm text-muted-foreground">
            {ceMarked ? 'CE marked for EU market' : 'Not CE marked'}
          </p>
        </div>
      </div>

      {/* MDR Class */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium">MDR Risk Class</p>
          <p className="text-sm text-muted-foreground">
            {mdrClass
              ? `Class ${mdrClass} - ${MDR_CLASS_DESCRIPTIONS[mdrClass]}`
              : 'Not classified'}
          </p>
        </div>
      </div>
    </div>
  )
}
