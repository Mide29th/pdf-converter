'use client';

import React, { useState } from 'react';
import { Upload, FileText, ImageIcon, Download, Loader2, X, Table, Layout, ScanText } from 'lucide-react';

import { convertPDFToImages, convertPDFToDocx, convertPDFToXlsx, convertPDFToPptx } from '@/lib/pdf-utils';
import ResultSection from './ResultSection';

type Format = 'docx' | 'xlsx' | 'pptx' | 'jpg' | 'png';

export default function PDFConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [format, setFormat] = useState<Format>('docx');
  const [useOCR, setUseOCR] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState<string[] | Blob | null>(null);
  const [currentFormat, setCurrentFormat] = useState<Format | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
      setCurrentFormat(null);
      setProgressMsg('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setResults(null);
        setCurrentFormat(null);
        setProgressMsg('');
      }
    }
  };

  const convertFile = async () => {
    if (!file) return;
    setIsConverting(true);
    setResults(null);
    setCurrentFormat(null);
    setProgressMsg('Starting conversion…');

    try {
      let conversionResult: string[] | Blob;
      const onProgress = (msg: string) => setProgressMsg(msg);

      switch (format) {
        case 'png':
        case 'jpg':
          setProgressMsg('Rendering pages…');
          conversionResult = await convertPDFToImages(file, format);
          break;
        case 'docx':
          conversionResult = await convertPDFToDocx(file, useOCR, onProgress);
          break;
        case 'xlsx':
          conversionResult = await convertPDFToXlsx(file, useOCR, onProgress);
          break;
        case 'pptx':
          setProgressMsg('Rendering slides…');
          conversionResult = await convertPDFToPptx(file);
          break;
        default:
          throw new Error('Unsupported format');
      }

      setResults(conversionResult);
      setCurrentFormat(format);
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Conversion failed. Please try again.');
    } finally {
      setIsConverting(false);
      setProgressMsg('');
    }
  };

  const ocrApplicable = format === 'docx' || format === 'xlsx';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {!file ? (
        <div
          className="pdf-drop-zone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{ padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
          <Upload size={40} color="#6366f1" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Drop your PDF here</p>
          <p style={{ color: 'rgba(255,255,255,0.28)', marginTop: '0.4rem', fontSize: '0.85rem' }}>or click to browse files</p>
        </div>
      ) : (
        <div className="glass" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <FileText color="#6366f1" size={20} />
            <div>
              <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{file.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button onClick={() => setFile(null)} style={{ background: 'transparent', padding: '0.5rem' }}>
            <X size={18} color="rgba(255,255,255,0.3)" />
          </button>
        </div>
      )}

      {file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Format selector */}
          <div>
            <p style={{ marginBottom: '1rem', fontWeight: 500, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Output Format</p>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <FormatButton active={format === 'docx'} onClick={() => setFormat('docx')} icon={<FileText size={18} />} label="DOCX" />
              <FormatButton active={format === 'xlsx'} onClick={() => setFormat('xlsx')} icon={<Table size={18} />} label="XLSX" />
              <FormatButton active={format === 'pptx'} onClick={() => setFormat('pptx')} icon={<Layout size={18} />} label="PPTX" />
              <FormatButton active={format === 'jpg'} onClick={() => setFormat('jpg')} icon={<ImageIcon size={18} />} label="JPG" />
              <FormatButton active={format === 'png'} onClick={() => setFormat('png')} icon={<ImageIcon size={18} />} label="PNG" />
            </div>
          </div>

          {/* OCR toggle — only meaningful for DOCX and XLSX */}
          {ocrApplicable && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.875rem 1rem',
                borderRadius: '10px',
                background: useOCR ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${useOCR ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <ScanText size={18} color={useOCR ? '#a5b4fc' : 'rgba(255,255,255,0.4)'} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: useOCR ? '#a5b4fc' : 'rgba(255,255,255,0.6)' }}>Deep Scan (OCR)</p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>Use for scanned documents or image‑based PDFs</p>
                </div>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => setUseOCR(v => !v)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: useOCR ? '#6366f1' : 'rgba(255,255,255,0.15)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
                aria-label="Toggle OCR"
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: useOCR ? '23px' : '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>
          )}

          {/* Convert button */}
          <button
            className="primary"
            onClick={convertFile}
            disabled={isConverting}
            style={{ width: '100%', fontSize: '1.1rem', height: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {isConverting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span style={{ fontSize: '0.9rem' }}>{progressMsg || 'Converting…'}</span>
              </>
            ) : (
              <>
                <Download size={20} />
                Convert Now
              </>
            )}
          </button>
        </div>
      )}

      {results && currentFormat && (
        <ResultSection
          results={results}
          format={currentFormat}
          fileName={file?.name || 'document.pdf'}
        />
      )}
    </div>
  );
}

function FormatButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
        color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
        border: '1px solid',
        borderColor: active ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '0.6rem 1rem',
        flex: 1,
        minWidth: '90px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
