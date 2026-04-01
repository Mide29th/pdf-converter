'use client';

import React from 'react';
import { Download, FileText, ImageIcon } from 'lucide-react';

interface ResultSectionProps {
  results: string[] | Blob;
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'jpg' | 'png' | null;
  fileName: string;
}

export default function ResultSection({ results, format, fileName }: ResultSectionProps) {
  const downloadFile = (data: string | Blob, index?: number) => {
    const link = document.createElement('a');
    if (typeof data === 'string') {
      link.href = data;
      link.download = `${fileName.replace('.pdf', '')}_page_${(index || 0) + 1}.${format}`;
    } else {
      link.href = URL.createObjectURL(data);
      link.download = `${fileName.replace('.pdf', '')}.${format}`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!format) return null;

  const isImage = format === 'png' || format === 'jpg';

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Conversion Complete!</h3>
        {!isImage && (
          <button 
            className="primary" 
            onClick={() => downloadFile(results as Blob)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={18} />
            Download {format.toUpperCase()}
          </button>
        )}
      </div>

      {isImage && Array.isArray(results) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {results.map((img, idx) => (
            <div key={idx} className="glass" style={{ padding: '0.5rem', position: 'relative', overflow: 'hidden' }}>
              <img 
                src={img} 
                alt={`Page ${idx + 1}`} 
                style={{ width: '100%', height: 'auto', borderRadius: '4px', display: 'block' }} 
              />
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                background: 'rgba(0,0,0,0.7)', 
                padding: '0.5rem', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#fff' }}>Page {idx + 1}</span>
                <button 
                  onClick={() => downloadFile(img, idx)}
                  style={{ background: 'var(--accent)', padding: '4px', borderRadius: '4px' }}
                >
                  <Download size={14} color="#fff" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isImage && (
        <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
          {format === 'docx' ? <FileText size={48} color="#3b82f6" /> : <FileText size={48} color="#888" />}
          <p style={{ marginTop: '1rem', fontWeight: 500 }}>Your {format.toUpperCase()} is ready for download.</p>
        </div>
      )}
    </div>
  );
}
