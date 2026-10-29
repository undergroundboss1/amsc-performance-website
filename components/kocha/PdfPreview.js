'use client';

import { useState } from 'react';

/**
 * "Preview here" for the lesson PDF. Nothing loads until the coach taps,
 * so slow connections only pay for the PDF when it is wanted. Phones that
 * cannot show PDFs inside a page (most Android browsers; iPhones may show
 * page 1 only) still have the Download button right above.
 */
export default function PdfPreview({ src, title }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full border border-white/20 text-white font-display font-bold text-sm tracking-wider uppercase hover:border-white/40 hover:translate-y-0 hover:shadow-none transition-colors bg-transparent"
      >
        Preview here
      </button>
    );
  }

  return (
    <div className="w-full">
      <iframe
        src={src}
        title={title}
        className="w-full h-[70vh] min-h-[420px] rounded-lg border border-white/10 bg-white"
      />
      <p className="text-secondary text-xs font-body mt-2">
        Preview blank, or only page 1 showing? Use Download to get both pages.
      </p>
    </div>
  );
}
