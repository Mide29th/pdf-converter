import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

// Set up the worker for pdfjs-dist
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

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

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    const dataUrl = canvas.toDataURL(`image/${format}`, 0.9);
    images.push(dataUrl);
  }

  return images;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
}

export async function convertPDFToDocx(file: File): Promise<Blob> {
  const text = await extractTextFromPDF(file);
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: text.split('\n').map(line => 
        new Paragraph({
          children: [new TextRun(line)],
        })
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
 * Extract structured text items with position data from each PDF page.
 * Groups text items into rows based on their Y-coordinate proximity,
 * then sorts columns by X-coordinate within each row.
 */
async function extractStructuredText(file: File): Promise<string[][][]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[][][] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Collect items with their transform positions
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

    // Sort by Y descending (PDF coordinates: origin at bottom-left)
    items.sort((a, b) => b.y - a.y);

    // Group items into rows by Y-coordinate proximity (within 5 units = same row)
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

    // Sort items within each row by X-coordinate (left to right)
    const pageRows: string[][] = rows.map(row => {
      row.sort((a, b) => a.x - b.x);
      return row.map(item => item.str);
    });

    pages.push(pageRows);
  }

  return pages;
}

/**
 * Convert PDF to XLSX.
 * Extracts text in a structured grid using coordinate analysis,
 * then writes each page as a separate Excel sheet.
 */
export async function convertPDFToXlsx(file: File): Promise<Blob> {
  const pages = await extractStructuredText(file);
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

/**
 * Convert PDF to PPTX.
 * Renders each page as a high-quality image, then embeds
 * each image as a full-bleed slide in a PowerPoint file.
 */
export async function convertPDFToPptx(file: File): Promise<Blob> {
  // Render all pages as PNG images
  const images = await convertPDFToImages(file, 'png');
  const pptx = new PptxGenJS();

  for (let i = 0; i < images.length; i++) {
    const slide = pptx.addSlide();
    slide.addImage({
      data: images[i],
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
    });
  }

  const pptxBlob = await pptx.write({ outputType: 'blob' }) as Blob;
  return pptxBlob;
}
