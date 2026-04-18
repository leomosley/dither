"use client";

import { useState } from "react";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const COMMANDS: Record<PackageManager, string> = {
  npm:  "npx shadcn add https://dither.mosly.dev/r/dither.json",
  pnpm: "pnpm dlx shadcn add https://dither.mosly.dev/r/dither.json",
  yarn: "yarn dlx shadcn add https://dither.mosly.dev/r/dither.json",
  bun:  "bunx --bun shadcn add https://dither.mosly.dev/r/dither.json",
};

const MANAGERS: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

export function TerminalBlock() {
  const [active, setActive] = useState<PackageManager>("bun");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(COMMANDS[active]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl bg-black overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-1">
          {MANAGERS.map((pm) => (
            <button
              key={pm}
              onClick={() => setActive(pm)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                active === pm
                  ? "bg-white/10 text-white"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              {pm}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="text-[11px] font-mono text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>

      {/* Command */}
      <pre className="px-4 py-4 text-sm font-mono text-white/65 overflow-x-auto">
        <span className="text-white/25 select-none">$ </span>{COMMANDS[active]}
      </pre>
    </div>
  );
}
