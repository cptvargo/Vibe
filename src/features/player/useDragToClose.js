import { useRef, useCallback, useEffect } from 'react';

const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.());
const DRAG_THRESHOLD = 8;

export function useDragToClose(onClose, scrollRef) {
  const elRef     = useRef(null);
  const startY    = useRef(0);
  const startTime = useRef(0);
  const dragging  = useRef(false);
  const frameRef  = useRef(null);

  const setStyle = useCallback((y, transition) => {
    const el = elRef.current;
    if (!el) return;
    el.style.transition   = transition || 'none';
    el.style.transform    = `translateY(${Math.max(0, y)}px)`;
    el.style.borderRadius = y > 8 ? `${Math.min(y * 0.15, 20)}px ${Math.min(y * 0.15, 20)}px 0 0` : '0';
  }, []);

  const dismiss = useCallback((delta, pxPerMs) => {
    if (pxPerMs > 0.3 || delta > 80) {
      setStyle(window.innerHeight, 'transform 0.3s cubic-bezier(0.32,0.72,0,1)');
      setTimeout(onClose, 300);
    } else {
      setStyle(0, 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)');
    }
  }, [setStyle, onClose]);

  // ── Native iOS — UIPanGestureRecognizer via NativeDragPlugin ─────────
  useEffect(() => {
    if (!IS_NATIVE) return;
    const subs = [];
    let nativeDrag = null;

    const setup = async () => {
      const { registerPlugin } = await import('@capacitor/core');
      nativeDrag = registerPlugin('NativeDrag');
      await nativeDrag.setEnabled({ enabled: true });

      subs.push(await nativeDrag.addListener('dragStart', () => {
        dragging.current  = true;
        startTime.current = Date.now();
      }));

      subs.push(await nativeDrag.addListener('dragMove', ({ deltaY }) => {
        if (!dragging.current) return;
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => setStyle(deltaY));
      }));

      subs.push(await nativeDrag.addListener('dragEnd', ({ deltaY, velocityY }) => {
        cancelAnimationFrame(frameRef.current);
        if (!dragging.current) return;
        dragging.current = false;
        // UIKit velocity is pts/sec — convert to pts/ms for dismiss threshold
        dismiss(deltaY, velocityY / 1000);
      }));
    };

    setup().catch(() => {});

    return () => {
      subs.forEach(s => s.remove());
      nativeDrag?.setEnabled({ enabled: false }).catch(() => {});
    };
  }, [setStyle, dismiss]);

  // Sync inner-div scrollTop to Swift so it knows when drag-to-close is safe
  useEffect(() => {
    if (!IS_NATIVE || !scrollRef?.current) return;
    let nativeDrag = null;

    const sync = async () => {
      const { registerPlugin } = await import('@capacitor/core');
      nativeDrag = registerPlugin('NativeDrag');
      const el = scrollRef.current;
      const onScroll = () => nativeDrag.setScrollTop({ value: el.scrollTop }).catch(() => {});
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    };

    let cleanup;
    sync().then(fn => { cleanup = fn; }).catch(() => {});
    return () => cleanup?.();
  }, [scrollRef]);

  // ── Web / PWA pointer events (also runs if NativeDrag plugin absent) ──
  // Handle pointer capture on the grab bar so move/up events aren't lost
  // when the finger travels outside the handle div during the drag.
  const onHandlePointerDown = useCallback((e) => {
    if (IS_NATIVE) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current  = false;
    startY.current    = e.clientY;
    startTime.current = Date.now();
  }, []);

  const onHandlePointerMove = useCallback((e) => {
    if (IS_NATIVE) return;
    const delta = e.clientY - startY.current;
    if (!dragging.current) {
      if (delta > DRAG_THRESHOLD) dragging.current = true; else return;
    }
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setStyle(delta));
  }, [setStyle]);

  const onHandlePointerUp = useCallback((e) => {
    if (IS_NATIVE) return;
    cancelAnimationFrame(frameRef.current);
    if (!dragging.current) return;
    dragging.current = false;
    const delta   = e.clientY - startY.current;
    const elapsed = Math.max(Date.now() - startTime.current, 1);
    dismiss(delta, delta / elapsed);
  }, [dismiss]);

  // Album art swipe zone — secondary drag, only when scrolled to top
  const onPointerDown = useCallback((e) => {
    if (IS_NATIVE) return;
    dragging.current  = false;
    startY.current    = e.clientY;
    startTime.current = Date.now();
  }, []);

  const onPointerMove = useCallback((e) => {
    if (IS_NATIVE) return;
    const delta     = e.clientY - startY.current;
    const scrollTop = scrollRef?.current?.scrollTop ?? 0;
    if (!dragging.current) {
      if (delta > DRAG_THRESHOLD && scrollTop <= 0) dragging.current = true; else return;
    }
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setStyle(delta));
  }, [setStyle, scrollRef]);

  const onPointerUp = useCallback((e) => {
    if (IS_NATIVE) return;
    cancelAnimationFrame(frameRef.current);
    if (!dragging.current) return;
    dragging.current = false;
    const delta   = e.clientY - startY.current;
    const elapsed = Math.max(Date.now() - startTime.current, 1);
    dismiss(delta, delta / elapsed);
  }, [dismiss]);

  return {
    elRef,
    onHandlePointerDown, onHandlePointerMove, onHandlePointerUp,
    onPointerDown, onPointerMove, onPointerUp,
  };
}
