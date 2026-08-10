import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
}

/** Slowly drifting, twinkling starfield on a fixed background canvas. */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars: Star[] = [];
    let frame = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(260, Math.floor((window.innerWidth * window.innerHeight) / 6000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.1 + 0.2,
        speed: Math.random() * 0.03 + 0.005,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const star of stars) {
        const twinkle = reducedMotion ? 0.7 : 0.55 + 0.45 * Math.sin(star.phase + time / 900);
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(180, 235, 240, ${0.35 * twinkle})`;
        context.fill();
        if (!reducedMotion) {
          star.y -= star.speed;
          if (star.y < -2) star.y = window.innerHeight + 2;
        }
      }
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    if (reducedMotion) {
      draw(0);
    } else {
      frame = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
