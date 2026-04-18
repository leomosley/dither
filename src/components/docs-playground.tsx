"use client";

import { useState, useRef, useCallback } from "react";
import { Dither } from "../../registry/dither/dither";
import type { PixelShape, ColorFilter } from "../../registry/dither/dither";
import { Slider } from "./ui/slider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaygroundState {
  src: string;
  pixelSize: number;
  gap: number;
  noise: number;
  pixelShape: PixelShape;
  cursorRadius: number;
  outerRadius: number;
  cursorStrength: number;
  spring: number;
  damping: number;
  colorFilter: ColorFilter;
}

const DEFAULTS: PlaygroundState = {
  src: "/icon.png",
  pixelSize: 2,
  gap: 1,
  noise: 0.4,
  pixelShape: "circle",
  cursorRadius: 50,
  outerRadius: 150,
  cursorStrength: 6,
  spring: 0.06,
  damping: 0.82,
  colorFilter: "none",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <span className="text-xs font-medium text-black/40">{children}</span>
      {hint && <span className="text-xs text-black/25 font-mono">{hint}</span>}
    </div>
  );
}

function ShapeButton({
  shape,
  active,
  onClick,
}: {
  shape: PixelShape;
  active: boolean;
  onClick: () => void;
}) {
  const svgMap: Record<PixelShape, React.ReactNode> = {
    circle: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" fill="currentColor" />
      </svg>
    ),
    square: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="1" fill="currentColor" />
      </svg>
    ),
    triangle: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <polygon points="11,3 20,19 2,19" fill="currentColor" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border transition-all cursor-pointer ${
        active
          ? "bg-black text-white border-black"
          : "bg-transparent text-black/40 border-black/10 hover:border-black/30 hover:text-black/70"
      }`}
    >
      {svgMap[shape]}
      <span className="text-[10px] font-medium">{shape}</span>
    </button>
  );
}

function FilterButton({
  label,
  value,
  active,
  onClick,
  preview,
}: {
  label: string;
  value: ColorFilter;
  active: boolean;
  onClick: () => void;
  preview: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all cursor-pointer flex-1 ${
        active
          ? "bg-black text-white border-black"
          : "bg-transparent border-black/10 hover:border-black/30"
      }`}
    >
      <span
        className="text-[10px] font-mono h-5 w-full rounded flex items-center justify-center"
        style={{ background: preview, border: active ? "none" : "1px solid rgba(0,0,0,0.06)" }}
      />
      <span
        className={`text-[10px] font-medium ${active ? "text-white" : "text-black/40"}`}
      >
        {label}
      </span>
    </button>
  );
}

function RadiusVisualizer({
  inner,
  outer,
  onInnerChange,
  onOuterChange,
}: {
  inner: number;
  outer: number;
  onInnerChange: (v: number) => void;
  onOuterChange: (v: number) => void;
}) {
  const maxOuter = 300;
  const size = 160;
  const center = size / 2;
  const innerR = (inner / maxOuter) * (size / 2 - 8);
  const outerR = (outer / maxOuter) * (size / 2 - 8);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="absolute inset-0">
            {/* Outer ring */}
            <circle
              cx={center}
              cy={center}
              r={outerR}
              fill="none"
              stroke="black"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.15"
            />
            {/* Inner ring */}
            <circle
              cx={center}
              cy={center}
              r={innerR}
              fill="rgba(0,0,0,0.04)"
              stroke="black"
              strokeWidth="1.5"
              strokeOpacity="0.3"
            />
            {/* Cursor dot */}
            <circle cx={center} cy={center} r="3" fill="black" fillOpacity="0.5" />
            {/* Fade zone fill */}
            <circle
              cx={center}
              cy={center}
              r={outerR}
              fill="none"
              stroke="black"
              strokeWidth={outerR - innerR}
              strokeOpacity="0.04"
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ paddingTop: 2 }}
          >
            <span className="text-[9px] text-black/20 font-mono tracking-widest">cursor</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <Label hint={`${inner}`}>inner radius</Label>
          <Slider
            min={0}
            max={200}
            step={0.5}
            value={[inner]}
            onValueChange={([v]) => onInnerChange(v)}
            className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
          />
        </div>
        <div>
          <Label hint={`${outer}`}>outer radius</Label>
          <Slider
            min={10}
            max={300}
            step={0.5}
            value={[outer]}
            onValueChange={([v]) => onOuterChange(v)}
            className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
          />
        </div>
      </div>
    </div>
  );
}

function PixelGridPreview({ size, gap }: { size: number; gap: number }) {
  const viewSize = 40;
  const step = size + gap;
  const count = Math.floor(viewSize / step);
  const dots = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      dots.push(
        <rect
          key={`${r}-${c}`}
          x={c * step}
          y={r * step}
          width={size}
          height={size}
          rx={size * 0.5}
          fill="black"
          fillOpacity="0.65"
        />
      );
    }
  }
  return (
    <svg width={32} height={32} viewBox={`0 0 ${viewSize} ${viewSize}`}>
      {dots}
    </svg>
  );
}

function PhysicsVisualizer({
  spring,
  damping,
}: {
  spring: number;
  damping: number;
}) {
  // Draw a rough spring-damper response curve
  const w = 200;
  const h = 48;
  const points: string[] = [];
  let pos = 1;
  let vel = 0;
  for (let i = 0; i < 80; i++) {
    const x = (i / 79) * w;
    const y = h / 2 - pos * (h / 2 - 4);
    points.push(`${x},${y}`);
    vel += (0 - pos) * spring;
    vel *= damping;
    pos += vel;
  }
  return (
    <svg width={w} height={h} className="overflow-visible">
      <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="black" strokeOpacity="0.06" strokeWidth="1" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="black"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main Playground ──────────────────────────────────────────────────────────

export function DocsPlayground() {
  const [state, setState] = useState<PlaygroundState>(DEFAULTS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    set("src", url);
  };

  const filterPreviews: Array<{ label: string; value: ColorFilter; preview: string }> = [
    { label: "none", value: "none", preview: "repeating-linear-gradient(45deg, #e5e5e5 0px, #e5e5e5 3px, #f5f5f5 3px, #f5f5f5 8px)" },
    { label: "invert", value: "invert", preview: "linear-gradient(90deg, #eee 0%, #888 100%)" },
    { label: "gray", value: "grayscale", preview: "linear-gradient(90deg, #999 0%, #ddd 50%, #666 100%)" },
    { label: "sepia", value: "sepia", preview: "linear-gradient(90deg, #c4a882 0%, #e8d5b0 100%)" },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 border border-black/10 rounded-2xl overflow-hidden">
        {/* Canvas preview */}
        <div className="relative bg-[#f9f9f9] flex items-center justify-center min-h-[420px] p-8">
          {/* Upload overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-white border border-black/10 rounded-full text-[11px] text-black/40 hover:text-black/70 hover:border-black/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            upload image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="w-full h-full" style={{ minHeight: 360 }}>
            <Dither
              key={state.src}
              src={state.src}
              pixelSize={state.pixelSize}
              gap={state.gap}
              noise={state.noise}
              pixelShape={state.pixelShape}
              cursorRadius={state.cursorRadius}
              outerRadius={state.outerRadius}
              cursorStrength={state.cursorStrength}
              spring={state.spring}
              damping={state.damping}
              colorFilter={state.colorFilter}
            />
          </div>
        </div>

        {/* Controls panel */}
        <div className="border-l border-black/8 bg-white overflow-y-auto max-h-[700px]">
          {/* Pixel appearance */}
          <div className="p-5 border-b border-black/6">
            <p className="text-xs font-medium text-black/30 mb-3">appearance</p>

            {/* Pixel shape */}
            <div className="mb-5">
              <Label>pixel shape</Label>
              <div className="flex gap-2">
                {(["circle", "square", "triangle"] as PixelShape[]).map((s) => (
                  <ShapeButton key={s} shape={s} active={state.pixelShape === s} onClick={() => set("pixelShape", s)} />
                ))}
              </div>
            </div>

            {/* Pixel size + gap */}
            <div className="mb-4 flex flex-col gap-3">
              <div>
                <Label hint={`${state.pixelSize}px`}>pixel size</Label>
                <Slider
                  min={1}
                  max={12}
                  step={1}
                  value={[state.pixelSize]}
                  onValueChange={([v]) => set("pixelSize", v)}
                  className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
                />
              </div>
              <div>
                <Label hint={`${state.gap}px`}>gap</Label>
                <Slider
                  min={0}
                  max={8}
                  step={0.5}
                  value={[state.gap]}
                  onValueChange={([v]) => set("gap", v)}
                  className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center justify-center rounded-md bg-black/[0.03] border border-black/6 p-2">
                  <PixelGridPreview size={state.pixelSize} gap={state.gap} />
                </div>
                <span className="text-[11px] text-black/25">{state.pixelSize}px dots · {state.gap}px apart</span>
              </div>
            </div>

            {/* Noise */}
            <div>
              <Label hint={state.noise.toFixed(2)}>noise / jitter</Label>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[state.noise]}
                onValueChange={([v]) => set("noise", v)}
                className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-black/20">uniform grid</span>
                <span className="text-[9px] text-black/20">scattered</span>
              </div>
            </div>
          </div>

          {/* Color filter */}
          <div className="p-5 border-b border-black/6">
            <p className="text-xs font-medium text-black/30 mb-3">color filter</p>
            <div className="flex gap-1.5">
              {filterPreviews.map((f) => (
                <FilterButton
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  active={state.colorFilter === f.value}
                  onClick={() => set("colorFilter", f.value)}
                  preview={f.preview}
                />
              ))}
            </div>
          </div>

          {/* Cursor influence */}
          <div className="p-5 border-b border-black/6">
            <p className="text-xs font-medium text-black/30 mb-3">cursor influence</p>
            <RadiusVisualizer
              inner={state.cursorRadius}
              outer={state.outerRadius}
              onInnerChange={(v) => set("cursorRadius", v)}
              onOuterChange={(v) => set("outerRadius", v)}
            />
            <div className="mt-4">
              <Label hint={state.cursorStrength.toFixed(2)}>strength</Label>
              <Slider
                min={0}
                max={20}
                step={0.1}
                value={[state.cursorStrength]}
                onValueChange={([v]) => set("cursorStrength", v)}
                className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-black/20">gentle</span>
                <span className="text-[9px] text-black/20">explosive</span>
              </div>
            </div>
          </div>

          {/* Physics */}
          <div className="p-5">
            <p className="text-xs font-medium text-black/30 mb-3">physics</p>
            <div className="mb-1">
              <PhysicsVisualizer spring={state.spring} damping={state.damping} />
              <p className="text-[9px] text-black/20 mt-1">Response curve — how pixels snap back after a push</p>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <Label hint={state.spring.toFixed(3)}>spring stiffness</Label>
                <Slider
                  min={0.005}
                  max={0.3}
                  step={0.005}
                  value={[state.spring]}
                  onValueChange={([v]) => set("spring", v)}
                  className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-black/20">floaty</span>
                  <span className="text-[9px] text-black/20">snappy</span>
                </div>
              </div>
              <div>
                <Label hint={state.damping.toFixed(3)}>damping</Label>
                <Slider
                  min={0.5}
                  max={0.99}
                  step={0.005}
                  value={[state.damping]}
                  onValueChange={([v]) => set("damping", v)}
                  className="[&>[data-slot=slider-track]]:h-[2px] [&>[data-slot=slider-thumb]]:h-3 [&>[data-slot=slider-thumb]]:w-3"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-black/20">oscillates</span>
                  <span className="text-[9px] text-black/20">no bounce</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated code */}
      <div className="mt-6 rounded-xl bg-black overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <span className="text-xs font-medium text-white/30">generated code</span>
          <button
            onClick={() => {
              const code = generateCode(state);
              navigator.clipboard.writeText(code);
            }}
            className="text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
          >
            copy
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-white/70 overflow-x-auto leading-relaxed whitespace-pre">
          {generateCode(state)}
        </pre>
      </div>
    </div>
  );
}

function generateCode(s: PlaygroundState): string {
  const lines: string[] = ['<Dither'];
  lines.push(`  src="${s.src === "/icon.png" ? "/icon.png" : "<your-image>"}"`);
  if (s.pixelSize !== DEFAULTS.pixelSize) lines.push(`  pixelSize={${s.pixelSize}}`);
  if (s.gap !== DEFAULTS.gap) lines.push(`  gap={${s.gap}}`);
  if (s.noise !== DEFAULTS.noise) lines.push(`  noise={${s.noise}}`);
  if (s.pixelShape !== DEFAULTS.pixelShape) lines.push(`  pixelShape="${s.pixelShape}"`);
  if (s.cursorRadius !== DEFAULTS.cursorRadius) lines.push(`  cursorRadius={${s.cursorRadius}}`);
  if (s.outerRadius !== DEFAULTS.outerRadius) lines.push(`  outerRadius={${s.outerRadius}}`);
  if (s.cursorStrength !== DEFAULTS.cursorStrength) lines.push(`  cursorStrength={${s.cursorStrength}}`);
  if (s.spring !== DEFAULTS.spring) lines.push(`  spring={${s.spring}}`);
  if (s.damping !== DEFAULTS.damping) lines.push(`  damping={${s.damping}}`);
  if (s.colorFilter !== DEFAULTS.colorFilter) lines.push(`  colorFilter="${s.colorFilter}"`);
  lines.push('/>');
  return lines.join('\n');
}
