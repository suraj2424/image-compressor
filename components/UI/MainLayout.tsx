"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Sparkles, Download, Trash2 } from "lucide-react";

// Modern, accessible, and thoughtfully reworked single-file component.
// - Built with Tailwind classes (glassmorphism + gradient accents).
// - In-browser compression using canvas (webp/jpeg/png) with quality slider.
// - Proper memory cleanup (revokeObjectURL), keyboard escape to close modal,
//   focus management for modal, aria-live status announcements.
// - Before/after sizes, download compressed image, remove/reset.

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // try to avoid CORS tainting
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

export default function ModernImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<number>(0.8);
  const [format, setFormat] = useState<"image/webp" | "image/jpeg" | "image/png">("image/webp");
  const [compressedBlobUrl, setCompressedBlobUrl] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const f = acceptedFiles?.[0];
    if (!f) return;

    // revoke previous
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (compressedBlobUrl) URL.revokeObjectURL(compressedBlobUrl);

    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setCompressedBlobUrl(null);
    setCompressedSize(null);

    // read image dimensions
    loadImage(url)
      .then((img) => setDimensions({ w: img.naturalWidth, h: img.naturalHeight }))
      .catch(() => setDimensions(null));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (compressedBlobUrl) URL.revokeObjectURL(compressedBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus modal close button and trap Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowModal(false);
      }
    }
    if (showModal) {
      setTimeout(() => closeBtnRef.current?.focus(), 50);
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [showModal]);

  // Simple progress animation helper while compression happens
  function animateProgressTo(target: number) {
    setProgress((p) => Math.max(p, 5));
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(target, p + Math.ceil((target - p) / 8) + 1);
        if (next >= target) {
          clearInterval(interval);
        }
        return next;
      });
    }, 120);
  }

  async function handleCompress() {
    if (!file || !previewUrl) return;

    setLoading(true);
    setProgress(3);
    statusRef.current?.setAttribute("aria-hidden", "false");

    try {
      animateProgressTo(30);

      const img = await loadImage(previewUrl);

      // create canvas sized to original image (you could implement downscaling here)
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      animateProgressTo(60);

      // toBlob supports quality for webp/jpeg
      const mime = format;
      const q = Math.max(0.05, Math.min(1, quality));

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), mime, q)
      );

      if (!blob) throw new Error("Compression failed (toBlob returned null)");

      // revoke previous compressed url
      if (compressedBlobUrl) URL.revokeObjectURL(compressedBlobUrl);
      const compressedUrl = URL.createObjectURL(blob);
      setCompressedBlobUrl(compressedUrl);
      setCompressedSize(blob.size);

      animateProgressTo(100);
      setTimeout(() => setProgress(100), 300);

      // announce
      if (statusRef.current) statusRef.current.textContent = "Compression complete";
    } catch (err) {
      console.error(err);
      if (statusRef.current) statusRef.current.textContent = "Compression failed";
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 700);
    }
  }

  function handleRemove() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (compressedBlobUrl) {
      URL.revokeObjectURL(compressedBlobUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setCompressedBlobUrl(null);
    setCompressedSize(null);
    setProgress(0);
    setLoading(false);
  }

  const extForFormat = (m: string) => (m === "image/webp" ? "webp" : m === "image/jpeg" ? "jpg" : "png");

  return (
    <main className="h-[calc(100vh-116px)] bg-gradient-to-b from-white via-slate-50 to-white/70 py-16 px-6 flex items-start justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-500">
            PixelTrim
          </h1>
          <p className="text-gray-500 mt-2">Modern, fast, and unobtrusive image compression — right in your browser.</p>
        </header>

        {/* Upload area */}
        <section
          {...getRootProps()}
          role="button"
          aria-label="Upload image"
          className={`group relative rounded-3xl p-10 cursor-pointer transition-all duration-200 shadow-sm border ${isDragActive ? "ring-2 ring-orange-300 border-transparent bg-orange-50/50 scale-[1.01]" : "border-gray-200 bg-white/60 hover:shadow-md"}`}>
          <input {...getInputProps()} />

          <div className="flex items-center gap-6">
            <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-tr from-orange-50 to-pink-50 flex items-center justify-center shadow-inner">
              <Upload className={`w-9 h-9 ${isDragActive ? "text-orange-500" : "text-gray-400"}`} />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-800">Drag & drop, or click to select an image</p>
              <p className="text-sm text-gray-400">JPG, PNG, WEBP, GIF — up to 10MB. Keyboard accessible.</p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm hover:brightness-95"
                >
                  Try with sample
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-gray-200 bg-white/80"
                >
                  Quick preview modal
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* If a file is selected show editor / preview */}
        {previewUrl && file && (
          <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Preview card */}
            <div className="md:col-span-2 bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-start gap-4">
                <div className="w-36 h-36 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center border border-gray-100">
                  <img src={previewUrl} alt={file.name} className="w-full h-full object-contain" onClick={() => setShowModal(true)} />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">{file.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{formatBytes(file.size)} • {dimensions ? `${dimensions.w}×${dimensions.h}px` : "–"}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Format</label>
                      <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm">
                        <option value="image/webp">WebP (modern)</option>
                        <option value="image/jpeg">JPEG</option>
                        <option value="image/png">PNG (lossless)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Quality</label>
                      <input
                        aria-label="quality"
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.01}
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="mt-2 w-full"
                      />
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                        <span>low</span>
                        <span>{Math.round(quality * 100)}%</span>
                        <span>high</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={handleCompress}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold shadow hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed">
                      <Sparkles className="w-4 h-4" />
                      {loading ? "Compressing…" : "Compress"}
                    </button>

                    <button onClick={handleRemove} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm">
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>

                    {compressedBlobUrl && (
                      <a
                        href={compressedBlobUrl}
                        download={`${file.name.replace(/\.[^.]+$/, "")}-compressed.${extForFormat(format)}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                    )}
                  </div>

                  {/* progress + sizes */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 transition-all" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="mt-3 text-sm text-gray-500 flex items-center gap-4">
                      <div>Original: {formatBytes(file.size)}</div>
                      <div>Compressed: {compressedSize ? formatBytes(compressedSize) : "—"}</div>
                      <div className="ml-auto">Reduction: {compressedSize ? Math.round(((file.size - compressedSize) / file.size) * 100) + "%" : "—"}</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Right column: details & actions*/}
            <aside className="space-y-4">
              <div className="rounded-2xl p-4 bg-white/70 border border-gray-100 shadow-sm">
                <h4 className="text-sm font-semibold">Quick facts</h4>
                <ul className="mt-3 text-sm text-gray-600 space-y-2">
                  <li>Client-side compression — no upload required.</li>
                  <li>Supports WebP/JPEG/PNG outputs.</li>
                  <li>Quality range: 5% — 100%.</li>
                </ul>
              </div>

              <div className="rounded-2xl p-4 bg-white/70 border border-gray-100 shadow-sm">
                <h4 className="text-sm font-semibold">Accessibility</h4>
                <p className="text-sm text-gray-600 mt-2">Keyboard friendly, Escape closes modal, clear aria-live status for screen readers.</p>
              </div>

            </aside>

          </section>
        )}

        {/* Status/announcer (screen readers) */}
        <div aria-live="polite" ref={statusRef} className="sr-only" />

        {/* Full-screen modal preview */}
        {showModal && previewUrl && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setShowModal(false)}
          >
            <div className="max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden shadow-2xl bg-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <img src={previewUrl} alt={file?.name ?? "preview"} className="max-w-[90vw] max-h-[80vh] object-contain block" />
                <button
                  ref={closeBtnRef}
                  aria-label="Close preview"
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
