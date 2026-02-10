'use server'

import { extractFromContent } from './extraction'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

interface BatchExtractionResult {
  success: boolean
  data?: ExtractedProduct
  error?: string
}

export async function extractFromSpreadsheetRow(
  headers: string[],
  values: Record<string, string>
): Promise<BatchExtractionResult> {
  // Format the row as key: value pairs
  const lines = headers
    .map((h) => `${h}: ${values[h] || ''}`)
    .filter((line) => !line.endsWith(': '))

  if (lines.length === 0) {
    return { success: false, error: 'Empty row' }
  }

  const content = `This is a single row from a medical device product spreadsheet. Extract the product information from the following fields:\n\n${lines.join('\n')}`

  return extractFromContent(content)
}
