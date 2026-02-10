'use server'

import { createClient } from '@/lib/supabase/server'
import type { BatchRow, BatchRowStatus } from '@/lib/types/batch-import'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

// ── Types ──────────────────────────────────────────────────────────────

export interface SavedBatchImport {
  id: string
  file_name: string
  total_rows: number
  status: string
  created_at: string
  updated_at: string
}

interface SavedBatchRow {
  id: string
  batch_import_id: string
  row_index: number
  raw_data: Record<string, string>
  extracted_data: ExtractedProduct | null
  status: BatchRowStatus
  error: string | null
}

// ── Create ─────────────────────────────────────────────────────────────

export async function createBatchImport(
  fileName: string,
  rows: { rawData: Record<string, string>; rowIndex: number }[]
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: batch, error: batchError } = await supabase
    .from('batch_imports')
    .insert({ file_name: fileName, total_rows: rows.length, status: 'processing' })
    .select('id')
    .single()

  if (batchError || !batch) {
    return { success: false, error: batchError?.message || 'Failed to create batch' }
  }

  const rowInserts = rows.map((r) => ({
    batch_import_id: batch.id,
    row_index: r.rowIndex,
    raw_data: r.rawData,
    status: 'pending' as const,
  }))

  // Insert in chunks of 500 to avoid payload limits
  for (let i = 0; i < rowInserts.length; i += 500) {
    const chunk = rowInserts.slice(i, i + 500)
    const { error } = await supabase.from('batch_import_rows').insert(chunk)
    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true, batchId: batch.id }
}

// ── Update row status ──────────────────────────────────────────────────

export async function updateBatchRow(
  batchId: string,
  rowIndex: number,
  update: {
    status: BatchRowStatus
    extracted_data?: ExtractedProduct | null
    error?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('batch_import_rows')
    .update({
      status: update.status,
      ...(update.extracted_data !== undefined && { extracted_data: update.extracted_data }),
      ...(update.error !== undefined && { error: update.error }),
    })
    .eq('batch_import_id', batchId)
    .eq('row_index', rowIndex)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Mark batch completed/cancelled ─────────────────────────────────────

export async function updateBatchStatus(
  batchId: string,
  status: 'completed' | 'cancelled'
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('batch_imports').update({ status }).eq('id', batchId)
}

// ── Load open batches ──────────────────────────────────────────────────

export async function getOpenBatchImports(): Promise<SavedBatchImport[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('batch_imports')
    .select('*')
    .in('status', ['processing', 'completed'])
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []) as SavedBatchImport[]
}

// ── Load a single batch with rows ──────────────────────────────────────

export async function getBatchImportWithRows(
  batchId: string
): Promise<{ batch: SavedBatchImport; rows: BatchRow[] } | null> {
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batch_imports')
    .select('*')
    .eq('id', batchId)
    .single()

  if (!batch) return null

  const { data: dbRows } = await supabase
    .from('batch_import_rows')
    .select('*')
    .eq('batch_import_id', batchId)
    .order('row_index', { ascending: true })

  const rows: BatchRow[] = ((dbRows ?? []) as SavedBatchRow[]).map((r) => ({
    id: `row-${r.row_index}`,
    rowIndex: r.row_index,
    rawData: r.raw_data,
    extracted: r.extracted_data,
    status: r.status,
    error: r.error ?? undefined,
  }))

  return { batch: batch as SavedBatchImport, rows }
}

// ── Delete batch ───────────────────────────────────────────────────────

export async function deleteBatchImport(
  batchId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  // Cascade deletes rows via FK
  const { error } = await supabase.from('batch_imports').delete().eq('id', batchId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
