import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { createWorker } from 'tesseract.js';

// Set up the worker for pdfjs-dist
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/** Render a single PDF page to a canvas data URL at 2x scale for clarity */
async function renderPageToDataUrl(page: pdfjsLib.PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context unavailable');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport, canvas }).promise;
  return canvas.toDataURL('image/png', 1.0);
}

/** 
 * Run Tesseract OCR on a single image data URL.
 * Returns extracted text.
 */
async function performOCR(
  dataUrl: string,
  onProgress?: (info: string) => void
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(`OCR: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  const { data } = await worker.recognize(dataUrl);
  await worker.terminate();
  return data.text;
}

/**
 * Run Tesseract OCR on a single image data URL and return structured word data
 * with bounding boxes, so we can reconstruct row/column layout for XLSX.
 */
async function performOCRStructured(
  dataUrl: string,
  onProgress?: (info: string) => void
): Promise<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[]> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(`OCR: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  const { data } = await worker.recognize(dataUrl);
  await worker.terminate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const words = (data as any).words.map((w: any) => ({ text: w.text, bbox: w.bbox }));
  return words;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public exports
// ─────────────────────────────────────────────────────────────────────────────

export async function convertPDFToImages(file: File, format: 'png' | 'jpg'): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    images.push(canvas.toDataURL(`image/${format}`, 0.9));
  }

  return images;
}

/**
 * Extract full text from a PDF.
 * When useOCR = true, each page is rendered to an image and scanned with Tesseract.
 * When useOCR = false (default), native text items are extracted directly.
 */
export async function extractTextFromPDF(
  file: File,
  useOCR = false,
  onProgress?: (msg: string) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Processing page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);

    if (useOCR) {
      const dataUrl = await renderPageToDataUrl(page);
      const text = await performOCR(dataUrl, (info) =>
        onProgress?.(`Page ${i}/${pdf.numPages} — ${info}`)
      );
      fullText += text + '\n\n';
    } else {
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
  }

  return fullText;
}

export async function convertPDFToDocx(
  file: File,
  useOCR = false,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const text = await extractTextFromPDF(file, useOCR, onProgress);

  const doc = new Document({
    sections: [{
      properties: {},
      children: text.split('\n').map(line =>
        new Paragraph({ children: [new TextRun(line)] })
      ),
    }],
  });

  return await Packer.toBlob(doc);
}

export async function convertPDFToText(file: File): Promise<Blob> {
  const text = await extractTextFromPDF(file);
  return new Blob([text], { type: 'text/plain' });
}

/**
 * Extract structured (grid-based) text from each PDF page.
 * With OCR: uses Tesseract word bounding boxes to reconstruct rows/columns.
 * Without OCR: uses native pdfjs coordinate transform data.
 */
async function extractStructuredText(
  file: File,
  useOCR = false,
  onProgress?: (msg: string) => void
): Promise<string[][][]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[][][] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Processing page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);

    if (useOCR) {
      const dataUrl = await renderPageToDataUrl(page);
      const words = await performOCRStructured(dataUrl, (info) =>
        onProgress?.(`Page ${i}/${pdf.numPages} — ${info}`)
      );

      if (words.length === 0) {
        pages.push([['(No text found on this page)']]);
        continue;
      }

      // Group words into rows by y0 proximity (within 10px at 2x scale)
      const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
      const rows: typeof words[] = [];
      let currentRow: typeof words = [sorted[0]];

      for (let j = 1; j < sorted.length; j++) {
        if (Math.abs(sorted[j].bbox.y0 - currentRow[0].bbox.y0) < 10) {
          currentRow.push(sorted[j]);
        } else {
          rows.push(currentRow);
          currentRow = [sorted[j]];
        }
      }
      rows.push(currentRow);

      const pageRows = rows.map(row => {
        row.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        return row.map(w => w.text);
      });

      pages.push(pageRows);
    } else {
      const textContent = await page.getTextContent();
      const items: { str: string; x: number; y: number }[] = [];

      for (const item of textContent.items) {
        const it = item as any;
        if (it.str && it.str.trim()) {
          items.push({
            str: it.str.trim(),
            x: it.transform ? it.transform[4] : 0,
            y: it.transform ? it.transform[5] : 0,
          });
        }
      }

      if (items.length === 0) {
        pages.push([['(No text found on this page)']]);
        continue;
      }

      items.sort((a, b) => b.y - a.y);
      const rows: { str: string; x: number; y: number }[][] = [];
      let currentRow: { str: string; x: number; y: number }[] = [items[0]];

      for (let j = 1; j < items.length; j++) {
        if (Math.abs(items[j].y - currentRow[0].y) < 5) {
          currentRow.push(items[j]);
        } else {
          rows.push(currentRow);
          currentRow = [items[j]];
        }
      }
      rows.push(currentRow);

      const pageRows = rows.map(row => {
        row.sort((a, b) => a.x - b.x);
        return row.map(item => item.str);
      });

      pages.push(pageRows);
    }
  }

  return pages;
}

export async function convertPDFToXlsx(
  file: File,
  useOCR = false,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const pages = await extractStructuredText(file, useOCR, onProgress);
  const workbook = XLSX.utils.book_new();

  pages.forEach((pageRows, idx) => {
    const worksheet = XLSX.utils.aoa_to_sheet(pageRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${idx + 1}`);
  });

  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function convertPDFToPptx(file: File): Promise<Blob> {
  const images = await convertPDFToImages(file, 'png');
  const pptx = new PptxGenJS();

  for (let i = 0; i < images.length; i++) {
    const slide = pptx.addSlide();
    slide.addImage({ data: images[i], x: 0, y: 0, w: '100%', h: '100%' });
  }

  const pptxBlob = await pptx.write({ outputType: 'blob' }) as Blob;
  return pptxBlob;
}
