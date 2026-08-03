import { useCallback, useEffect, useRef, useState } from "react";

export interface ViewState {
  x: number;
  y: number;
  z: number;
}

export function useViewport(initial: ViewState = { x: 60, y: 60, z: 12 }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<ViewState>(initial);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pan = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const v = viewRef.current;
      const next = Math.min(160, Math.max(2, v.z * Math.exp(-dy * 0.0015)));
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const k = next / v.z;
      setView({ x: px - (px - v.x) * k, y: py - (py - v.y) * k, z: next });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const startPan = useCallback((e: React.PointerEvent) => {
    const v = viewRef.current;
    pan.current = { px: e.clientX, py: e.clientY, ox: v.x, oy: v.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const movePan = useCallback((e: React.PointerEvent) => {
    const p = pan.current;
    if (!p) return;
    setView((v) => ({ ...v, x: p.ox + (e.clientX - p.px), y: p.oy + (e.clientY - p.py) }));
  }, []);

  const endPan = useCallback(() => {
    pan.current = null;
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const el = ref.current;
    const w = el?.clientWidth ?? 800;
    const h = el?.clientHeight ?? 600;
    setView((v) => {
      const next = Math.min(160, Math.max(2, v.z * factor));
      const k = next / v.z;
      return { x: w / 2 - (w / 2 - v.x) * k, y: h / 2 - (h / 2 - v.y) * k, z: next };
    });
  }, []);

  const fit = useCallback((w = 60, h = 38, padding = 60) => {
    const el = ref.current;
    const cw = el?.clientWidth ?? 800;
    const ch = el?.clientHeight ?? 600;
    const z = Math.min((cw - padding * 2) / w, (ch - padding * 2) / h);
    setView({ x: (cw - w * z) / 2, y: (ch - h * z) / 2, z });
  }, []);

  const toModel = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    const rect = el?.getBoundingClientRect();
    const v = viewRef.current;
    const px = clientX - (rect?.left ?? 0);
    const py = clientY - (rect?.top ?? 0);
    return { x: (px - v.x) / v.z, y: (py - v.y) / v.z };
  }, []);

  const centerOn = useCallback((mx: number, my: number, zoom?: number) => {
    const el = ref.current;
    const cw = el?.clientWidth ?? 800;
    const ch = el?.clientHeight ?? 600;
    setView((v) => {
      const z = zoom ?? v.z;
      return { x: cw / 2 - mx * z, y: ch / 2 - my * z, z };
    });
  }, []);

  return {
    ref,
    view,
    setView,
    startPan,
    movePan,
    endPan,
    zoomBy,
    fit,
    toModel,
    centerOn,
  };
}

export function GridDefs({ z, view }: { z: number; view: ViewState }) {
  const step = z < 6 ? 5 : 1;
  return (
    <>
      <defs>
        <pattern
          id="grid-minor"
          width={step * z}
          height={step * z}
          patternUnits="userSpaceOnUse"
          x={view.x}
          y={view.y}
        >
          <path
            d={`M ${step * z} 0 L 0 0 0 ${step * z}`}
            fill="none"
            stroke="var(--canvas-grid)"
            strokeWidth="1"
            opacity="0.6"
          />
        </pattern>
        <pattern
          id="grid-major"
          width={step * z * 5}
          height={step * z * 5}
          patternUnits="userSpaceOnUse"
          x={view.x}
          y={view.y}
        >
          <rect width="100%" height="100%" fill="url(#grid-minor)" />
          <path
            d={`M ${step * z * 5} 0 L 0 0 0 ${step * z * 5}`}
            fill="none"
            stroke="var(--canvas-grid)"
            strokeWidth="1.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-major)" />
    </>
  );
}
