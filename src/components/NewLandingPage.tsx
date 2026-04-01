'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { FileText, Image as ImageIcon, Layout, Table, FileStack, Shield, Zap, Globe } from 'lucide-react';

const PDFConverter = dynamic(() => import('./PDFConverter'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 text-sm text-white/30">
      Loading…
    </div>
  )
});

export default function NewLandingPage() {
  return (
    <div className="lp-root">
      {/* ── Hero ────────────────────────────────────────────── */}
      <main>
        <section className="lp-hero">
          {/* Ambient glow */}
          <div className="lp-glow lp-glow-1" />
          <div className="lp-glow lp-glow-2" />

          <div className="lp-hero-content">
            <div className="lp-badge">
              <span className="lp-badge-dot" />
              Instantly convert · No signup needed
            </div>

            <h1 className="lp-headline">
              Documents, engineered <br />
              with precision.
            </h1>

            <p className="lp-sub">
              Convert, compress, and transform PDF files with studio-grade accuracy.
              Fast, private, and completely in your browser.
            </p>

            {/* Drop Zone */}
            <div className="lp-dropzone-wrap">
              <PDFConverter />
            </div>

            {/* Format pills */}
            <div className="lp-formats">
              {['DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG'].map(f => (
                <span key={f} className="lp-pill">{f}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature Strip ──────────────────────────────────── */}
        <section className="lp-strip">
          <FeatureItem icon={<Zap size={18} />} title="Instant" desc="Conversion happens locally in your browser — zero waiting." />
          <div className="lp-strip-divider" />
          <FeatureItem icon={<Shield size={18} />} title="Private" desc="Your files never leave your device. No uploads, no logs." />
          <div className="lp-strip-divider" />
          <FeatureItem icon={<Globe size={18} />} title="Universal" desc="All major document and image formats supported out of the box." />
        </section>

      </main>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="lp-feature">
      <div className="lp-feature-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
    </div>
  );
}
