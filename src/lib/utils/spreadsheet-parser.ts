import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { ParsedSpreadsheet } from '@/lib/types/batch-import'

export function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return parseCSV(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXLSX(file)
  return Promise.reject(new Error('Unsupported file type. Use .csv, .xlsx, or .xls'))
}

function parseCSV(file: File): Promise<ParsedSpreadsheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          rows: results.data,
          fileName: file.name,
          totalRows: results.data.length,
        })
      },
      error: (error) => reject(error),
    })
  })
}

async function parseXLSX(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
    raw: false,
  })

  // Extract headers from first row keys
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : []

  // Normalize all values to strings
  const rows = jsonData.map((row) => {
    const normalized: Record<string, string> = {}
    for (const key of headers) {
      normalized[key] = row[key] != null ? String(row[key]) : ''
    }
    return normalized
  })

  return {
    headers,
    rows,
    fileName: file.name,
    totalRows: rows.length,
  }
}
