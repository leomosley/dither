"use client";

import { useEffect, useRef } from "react";

export type ColorFilterFn = (r: number, g: number, b: number) => [number, number, number];
export type ColorFilterPreset = "invert" | "grayscale" | "sepia" | "none";
export type ColorFilter = ColorFilterPreset | ColorFilterFn;
export type PixelShape = "circle" | "square" | "triangle";
export type RGBColor = [number, number, number];

function parseColor(color: string | RGBColor): RGBColor {
  if (Array.isArray(color)) return color;
  const hex = color.replace("#", "");
  const full = hex.length === 3
    ? hex.split("").map(c => c + c).join("")
    : hex;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function colorDistance(r: number, g: number, b: number, target: RGBColor): number {
  return Math.sqrt(
    (r - target[0]) ** 2 +
    (g - target[1]) ** 2 +
    (b - target[2]) ** 2,
  );
}

const PRESETS: Record<ColorFilterPreset, ColorFilterFn> = {
  none:      (r, g, b) => [r, g, b],
  invert:    (r, g, b) => [255 - r, 255 - g, 255 - b],
  grayscale: (r, g, b) => { const l = 0.299 * r + 0.587 * g + 0.114 * b; return [l, l, l]; },
  sepia:     (r, g, b) => [
    Math.min(255, r * 0.393 + g * 0.769 + b * 0.189),
    Math.min(255, r * 0.349 + g * 0.686 + b * 0.168),
    Math.min(255, r * 0.272 + g * 0.534 + b * 0.131),
  ],
};

function drawPixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: PixelShape,
) {
  const half = size / 2;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(x, y, half, 0, Math.PI * 2);
  } else if (shape === "square") {
    ctx.rect(x - half, y - half, size, size);
  } else {
    // Equilateral triangle centred on (x, y)
    const h = half * Math.sqrt(3);
    ctx.moveTo(x,        y - half * (2 / Math.sqrt(3)));
    ctx.lineTo(x + half, y + h / 3);
    ctx.lineTo(x - half, y + h / 3);
    ctx.closePath();
  }
  ctx.fill();
}

interface Pixel {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  size: number;
}


function samplePixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  filterFn: ColorFilterFn,
  transparentColor: RGBColor | undefined,
  transparentThreshold: number,
): [number, number, number] | null {
  const sx  = Math.min(Math.max(Math.round(x), 0), canvasW - 1);
  const sy  = Math.min(Math.max(Math.round(y), 0), canvasH - 1);
  const idx = (sy * canvasW + sx) * 4;
  if (data[idx + 3] === 0) return null;
  const [pr, pg, pb] = filterFn(data[idx], data[idx + 1], data[idx + 2]);
  if (transparentColor && colorDistance(pr, pg, pb, transparentColor) < transparentThreshold) return null;
  return [pr, pg, pb];
}

function buildPixels(
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  pixelSize: number,
  gap: number,
  filterFn: ColorFilterFn,
  noise = 0,
  transparentColor?: RGBColor,
  transparentThreshold = 30,
  padding = 0,
): Pixel[] {
  const off = document.createElement("canvas");
  off.width  = canvasW;
  off.height = canvasH;
  const ctx = off.getContext("2d")!;

  // Draw image into the padded inner area so edge pixels have empty space to move into.
  const innerW = canvasW - 2 * padding;
  const innerH = canvasH - 2 * padding;
  const scale  = Math.max(innerW / img.naturalWidth, innerH / img.naturalHeight);
  const sw     = img.naturalWidth  * scale;
  const sh     = img.naturalHeight * scale;
  ctx.drawImage(img, padding + (innerW - sw) / 2, padding + (innerH - sh) / 2, sw, sh);

  const { data } = ctx.getImageData(0, 0, canvasW, canvasH);
  const step     = pixelSize + gap;
  const pixels: Pixel[] = [];

  // Pre-compute which live-pixel grid positions are skipped ("dead").
  // Dead positions sit on a staggered criss-cross grid with a small per-cell random jitter.
  const totalCols = Math.ceil(canvasW / step) + 1;
  const deadSet   = new Set<number>();

  if (noise > 0) {
    const deadEvery  = Math.max(2, Math.round(1 / noise));
    const jitterMax  = Math.max(1, Math.floor(deadEvery / 3));
    const deadRowCount = Math.ceil(canvasH / step / deadEvery) + 2;
    const deadColCount = Math.ceil(canvasW / step / deadEvery) + 2;

    for (let dr = 0; dr < deadRowCount; dr++) {
      // Alternate rows are staggered by half the dead-pixel period → criss-cross.
      const stagger = (dr % 2) * Math.floor(deadEvery / 2);
      for (let dc = 0; dc < deadColCount; dc++) {
        const baseCol = dc * deadEvery + stagger;
        const baseRow = dr * deadEvery;
        // Small random offset so the pattern isn't perfectly mechanical.
        const jCol = Math.round((Math.random() - 0.5) * 2 * jitterMax);
        const jRow = Math.round((Math.random() - 0.5) * 2 * jitterMax);
        const finalCol = baseCol + jCol;
        const finalRow = baseRow + jRow;
        if (finalCol >= 0 && finalRow >= 0) {
          deadSet.add(finalRow * totalCols + finalCol);
        }
      }
    }
  }

  let row = 0;
  for (let y = step / 2; y < canvasH; y += step) {
    let col = 0;
    for (let x = step / 2; x < canvasW; x += step) {
      if (!deadSet.has(row * totalCols + col)) {
        const rgb = samplePixel(data, x, y, canvasW, canvasH, filterFn, transparentColor, transparentThreshold);
        if (rgb) pixels.push({ x, y, homeX: x, homeY: y, vx: 0, vy: 0, r: rgb[0], g: rgb[1], b: rgb[2], size: pixelSize });
      }
      col++;
    }
    row++;
  }

  return pixels;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface DitherProps {
  src: string;
  /** Size of each pixel in px (default 2) */
  pixelSize?: number;
  /** Gap between pixels in px (default 1) */
  gap?: number;
  /** Jitter applied to pixel home positions to reduce Moiré patterns, as a fraction of grid step (default 0.4) */
  noise?: number;
  /** Shape of each pixel (default "circle") */
  pixelShape?: PixelShape;
  /** Inner radius — pixels inside this zone are strongly repelled, creating a circle of dead space (default 50) */
  cursorRadius?: number;
  /** Outer radius — the furthest reach of cursor influence; force fades to zero at this distance (default 150) */
  outerRadius?: number;
  /** How hard the cursor pushes pixels (default 6) */
  cursorStrength?: number;
  /** Spring stiffness — how fast pixels return home (default 0.06) */
  spring?: number;
  /** Velocity damping each frame (default 0.82) */
  damping?: number;
  /** Color filter: preset name or custom (r,g,b)=>[r,g,b] function */
  colorFilter?: ColorFilter;
  /** Pixels whose color is within euclideanDistance of transparentColor are skipped */
  transparentColor?: string | RGBColor;
  /** Euclidean RGB distance threshold for transparentColor (default 30) */
  euclideanDistance?: number;
  /**
   * Empty padding (px) added around the image so edge pixels have room to be pushed.
   * Defaults to outerRadius so the cursor can fully influence pixels at any image edge.
   */
  padding?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Dither({
  src,
  pixelSize      = 2,
  gap            = 1,
  noise          = 0.4,
  pixelShape     = "circle",
  cursorRadius   = 50,
  outerRadius    = 150,
  cursorStrength = 6,
  spring         = 0.06,
  damping        = 0.82,
  colorFilter    = "none",
  transparentColor,
  euclideanDistance = 30,
  padding,
  className,
  style,
}: DitherProps) {
  // Default padding = outerRadius: guarantees the cursor can push edge pixels
  // as far as any other pixel before they leave the canvas.
  const effectivePadding = padding ?? outerRadius;
  const canvasRef  = useRef<HTMLCanvasElement>(null!);
  const pixels     = useRef<Pixel[]>([]);
  const mouse      = useRef({ x: -9999, y: -9999 });
  const rafRef     = useRef<number>(0);
  const filterFn   = useRef<ColorFilterFn>(PRESETS.none);
  const shapeRef   = useRef<PixelShape>(pixelShape);
  const imgRef     = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    filterFn.current = typeof colorFilter === "function"
      ? colorFilter
      : PRESETS[colorFilter] ?? PRESETS.none;
  }, [colorFilter]);

  useEffect(() => { shapeRef.current = pixelShape; }, [pixelShape]);

  // Load image → build pixels; rebuild on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rebuild = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!imgRef.current || w === 0 || h === 0) return;
      canvas.width  = w;
      canvas.height = h;
        const tc = transparentColor ? parseColor(transparentColor) : undefined;
        pixels.current = buildPixels(imgRef.current, w, h, pixelSize, gap, filterFn.current, noise, tc, euclideanDistance, effectivePadding);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      rebuild();
    };
    img.src = src;

    const observer = new ResizeObserver(rebuild);
    observer.observe(canvas);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, pixelSize, gap, noise, pixelShape, colorFilter, transparentColor, euclideanDistance, effectivePadding]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const outer2 = outerRadius * outerRadius;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (const p of pixels.current) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;

        // Cursor repulsion — adds to velocity only (gives organic inertia/throw feel).
        if (d2 < outer2 && d2 > 0.001) {
          const d     = Math.sqrt(d2);
          const force = cursorStrength * (cursorRadius / Math.max(d, 0.5)) * (1 - d / outerRadius);
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }

        // Damp cursor velocity.
        p.vx *= damping;
        p.vy *= damping;
        p.x  += p.vx;
        p.y  += p.vy;

        // Home return — lerp position directly, bypassing velocity entirely.
        // This prevents oscillation and the Moiré wave patterns it causes.
        p.x += (p.homeX - p.x) * spring;
        p.y += (p.homeY - p.y) * spring;

        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        drawPixel(ctx, p.x, p.y, p.size, shapeRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cursorRadius, outerRadius, cursorStrength, spring, damping]);

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current.getBoundingClientRect();
    mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMouseLeave = () => { mouse.current = { x: -9999, y: -9999 }; };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ width: "100%", height: "100%", display: "block", ...style }}
      className={className}
    />
  );
}
