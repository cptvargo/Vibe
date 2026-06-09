import { useRef, useEffect } from 'react';

export function Waveform({ accent, progress = 0 }) {
  const canvasRef = useRef(null);
  const shapeRef  = useRef(null);

  useEffect(() => {
    const bars = 64, heights = [];
    for (let i = 0; i < bars; i++) {
      const h = Math.abs(Math.sin(i * 0.28)) * 0.35 + Math.abs(Math.sin(i * 0.65)) * 0.35 + Math.abs(Math.sin(i * 0.12)) * 0.3;
      heights.push(Math.max(0.08, h));
    }
    shapeRef.current = heights;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const heights = shapeRef.current;
    if (!canvas || !heights) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, bars = heights.length;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < bars; i++) {
      const x = i * (W / bars), barW = W / bars - 1.5, h = heights[i] * H * 0.85, y = (H - h) / 2;
      const played = i / bars < progress;
      ctx.fillStyle = played ? accent : `${accent}35`;
      ctx.beginPath(); ctx.roundRect(x, y, barW, h, 2); ctx.fill();
    }
  }, [progress, accent]);

  return <canvas ref={canvasRef} width={600} height={72} style={{ width: '100%', height: 72, display: 'block' }} />;
}
