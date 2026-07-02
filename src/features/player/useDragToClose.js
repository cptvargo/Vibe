import { useRef, useCallback } from 'react';

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

  const finish = useCallback((delta, elapsed) => {
    cancelAnimationFrame(frameRef.current);
    if (!dragging.current) return;
    dragging.current = false;
    const velocity = delta / Math.max(elapsed, 1);
    if (velocity > 0.3 || delta > 80) {
      setStyle(window.innerHeight, 'transform 0.3s cubic-bezier(0.32,0.72,0,1)');
      setTimeout(onClose, 300);
    } else {
      setStyle(0, 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)');
    }
  }, [setStyle, onClose]);

  // Grab bar — setPointerCapture keeps all move/up events on this element
  // even after the finger travels outside it, so the drag is never lost.
  const onHandlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current  = false;
    startY.current    = e.clientY;
    startTime.current = Date.now();
  }, []);

  const onHandlePointerMove = useCallback((e) => {
    const delta = e.clientY - startY.current;
    if (!dragging.current) {
      if (delta > DRAG_THRESHOLD) dragging.current = true; else return;
    }
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setStyle(delta));
  }, [setStyle]);

  const onHandlePointerUp = useCallback((e) => {
    finish(e.clientY - startY.current, Date.now() - startTime.current);
  }, [finish]);

  // Album art area — secondary drag zone, only when scroll is at top
  const onPointerDown = useCallback((e) => {
    dragging.current  = false;
    startY.current    = e.clientY;
    startTime.current = Date.now();
  }, []);

  const onPointerMove = useCallback((e) => {
    const delta     = e.clientY - startY.current;
    const scrollTop = scrollRef?.current?.scrollTop ?? 0;
    if (!dragging.current) {
      if (delta > DRAG_THRESHOLD && scrollTop <= 0) dragging.current = true; else return;
    }
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setStyle(delta));
  }, [setStyle, scrollRef]);

  const onPointerUp = useCallback((e) => {
    finish(e.clientY - startY.current, Date.now() - startTime.current);
  }, [finish]);

  return { elRef, onHandlePointerDown, onHandlePointerMove, onHandlePointerUp, onPointerDown, onPointerMove, onPointerUp };
}
