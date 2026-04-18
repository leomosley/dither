"use client";

import { Dither } from "../../registry/dither/dither";

export function DitherHero() {
  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      {/* Centered canvas — square, always fits within viewport */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          style={{
            width: "min(calc(100vh), calc(100vw))",
            height: "min(calc(100vh), calc(100vw))",
          }}
        >
          <Dither
            src="/icon.png"
            pixelSize={2}
            gap={0}
            noise={0.15}
            pixelShape="square"
            transparentColor="#ffffff"
            cursorRadius={3}
          />
        </div>
      </div>

      {/* Text — bottom left */}
      <div className="absolute bottom-10 left-8 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          dither
        </h1>
        <p className="text-sm text-black/40 max-w-56 leading-relaxed">
          reactive dithered images - in a shadcn component.
        </p>
        <div className="flex items-center gap-5 pt-1">
          <a
            href="/docs"
            className="text-sm text-black font-medium hover:text-black/50 transition-colors"
          >
            docs
          </a>
          <a
            href="https://github.com/leomosley/dither"
            className="text-sm text-black/35 hover:text-black/60 transition-colors inline-flex items-center gap-0.5"
          >
            github
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className="mb-1.5"
            >
              <path
                d="M2 8L8 2M8 2H4M8 2V6"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
