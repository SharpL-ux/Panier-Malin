import { pdf, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import type { ComparisonSheet, StoreSheet } from '../../services/pdfModel';
import { ComparisonDocument, StoreSheetDocument } from './PdfDocuments';

async function save(document: ReactElement<DocumentProps>, fileName: string): Promise<void> {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  window.document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const downloadStoreSheet = (sheet: StoreSheet) =>
  save(StoreSheetDocument({ sheet }), sheet.fileName);
export const downloadComparisonSheet = (sheet: ComparisonSheet) =>
  save(ComparisonDocument({ sheet }), sheet.fileName);
