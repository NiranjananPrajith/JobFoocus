'use client';

import { useEffect, useRef, useCallback } from 'react';

interface HeroBubbleBackgroundProps {
  className?: string;
}

export default function HeroBubbleBackground({ className }: HeroBubbleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const posRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    // Lerp: smoothly follow mouse
    posRef.current.x += (mouseRef.current.x - posRef.current.x) * 0.06;
    posRef.current.y += (mouseRef.current.y - posRef.current.y) * 0.06;

    // Clear
    ctx.clearRect(0, 0, w, h);

    const px = posRef.current.x;
    const py = posRef.current.y;
    const radius = Math.min(w * 0.55, 480);

    // Draw blob shadow
    ctx.save();
    ctx.filter = 'blur(60px)';
    const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
    grad.addColorStop(0, 'rgba(250, 82, 15, 0.45)');
    grad.addColorStop(0.45, 'rgba(255, 140, 0, 0.28)');
    grad.addColorStop(0.75, 'rgba(255, 217, 0, 0.10)');
    grad.addColorStop(1, 'rgba(255, 248, 224, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.offsetParent?.getBoundingClientRect();
      const offsetX = rect ? rect.left : 0;
      const offsetY = rect ? rect.top : 0;
      mouseRef.current = {
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    canvas.addEventListener('mouseleave', handleMouseLeave);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
