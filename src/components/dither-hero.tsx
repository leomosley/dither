"use client";

import { Dither } from "../../registry/dither/dither";

export function DitherHero() {
  return (
    <div className="relative w-full h-screen bg-white overflow-hidden flex flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="w-100 h-100">
        <Dither
          src="/icon.png"
          pixelSize={1}
          gap={0}
          cursorRadius={10}
          outerRadius={100}
          cursorStrength={1}
          colorFilter="invert"
          pixelShape="square"
          transparentColor="#ffffff"
          euclideanDistance={40}
          spring={0.06}
          damping={0.82}
          noise={0.2}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <h1 className="text-5xl font-bold tracking-tight text-black">dither</h1>
        <p className="text-black/50 text-lg max-w-sm">
          Pass any image. Get a live, cursor-reactive dithered render.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="/docs"
          className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors"
        >
          Docs
        </a>
        <a
          href="https://github.com/leomosley/dither"
          className="px-5 py-2.5 border border-black/20 text-black text-sm font-medium rounded-full hover:border-black/40 transition-colors"
        >
          GitHub
        </a>
      </div>

      <code className="text-xs text-black/30 font-mono">
        npx shadcn add https://dither.mosly.dev/r/dither.json
      </code>
    </div>
  );
}
