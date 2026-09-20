export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

// Excel interpreta un campo que empieza con = + - @ como fórmula. Prefijamos con
// una comilla simple para que el CSV exportado no ejecute nada al abrirlo.
const FORMULA_PREFIXES = ['=', '+', '-', '@'];

export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  let text = String(value);
  if (FORMULA_PREFIXES.includes(text.charAt(0))) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  // El BOM hace que Excel abra el archivo como UTF-8 y no rompa los acentos.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
