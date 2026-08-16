"use client";

import { useState } from "react";

export default function DemoVideoButton() {
  const [isOpen, setIsOpen] = useState(false);

  // Replace this with your actual demo video URL
  const DEMO_VIDEO_URL = "https://youtu.be/tfSS1e3kYeo?si=2C-pQhXy7pcw1Mac";

  return (
    <>
      {/* Demo Video Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="group relative hidden items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/[0.08] px-4 py-2 text-sm font-medium text-blue-300 transition-all duration-300 hover:border-blue-400/60 hover:bg-blue-400/[0.14] hover:text-blue-200 sm:flex"
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
        </span>

        <span>Demo Video</span>

        {/* Arrow */}
        <svg
          className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f] shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Personal Brain — Demo
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500">
                  See how Personal Brain works
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Close demo"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Video */}
            <div className="aspect-video w-full bg-black">
              <iframe
                src={DEMO_VIDEO_URL}
                title="Personal Brain Demo"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}