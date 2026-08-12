import { useEffect, useRef } from 'react';
import type { BackgroundId } from '../settings';

interface StarfieldProps {
  mode?: BackgroundId;
  animated?: boolean;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
}

const seededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

/** Configurable deep-space canvas with two CSS grid overlays. */
export function Starfield({ mode = 'stars', animated = true }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = animated && !reducedMotion;
    let stars: Star[] = [];
    let frame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const random = seededRandom(73);
      const count = Math.min(300, Math.floor((width * height) / 5500));
      stars = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        radius: random() * 1.1 + 0.2,
        speed: random() * 0.03 + 0.005,
        phase: random() * Math.PI * 2,
      }));
    };

    const drawStars = (time: number, opacity = 0.35) => {
      for (const star of stars) {
        const twinkle = shouldAnimate ? 0.55 + 0.45 * Math.sin(star.phase + time / 900) : 0.7;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(180, 235, 240, ${opacity * twinkle})`;
        context.fill();
        if (shouldAnimate) {
          star.y -= star.speed;
          if (star.y < -2) star.y = height + 2;
        }
      }
    };

    const drawGalaxy = (time: number) => {
      drawStars(time, 0.22);
      const rotation = shouldAnimate ? time / 28000 : 0;
      const radius = Math.min(width, height) * 0.34;
      const random = seededRandom(19);
      context.save();
      context.translate(width * 0.72, height * 0.3);
      context.rotate(-0.25);
      context.scale(1, 0.34);
      for (let i = 0; i < 360; i++) {
        const arm = i % 3;
        const distance = radius * Math.sqrt(random());
        const angle =
          arm * ((Math.PI * 2) / 3) +
          (distance / radius) * 5 +
          rotation +
          random() * 0.35;
        const alpha = (1 - distance / radius) * 0.25 + 0.03;
        context.beginPath();
        context.arc(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          random() * 1.4 + 0.3,
          0,
          Math.PI * 2,
        );
        context.fillStyle = `rgba(126, 252, 246, ${alpha})`;
        context.fill();
      }
      context.restore();
    };

    const drawPlanet = (time: number) => {
      drawStars(time, 0.3);
      const radius = Math.max(190, Math.min(width, height) * 0.36);
      const x = width * 0.86;
      const y = height + radius * 0.24;
      const glow = context.createRadialGradient(
        x - radius * 0.35,
        y - radius * 0.55,
        1,
        x,
        y,
        radius,
      );
      glow.addColorStop(0, 'rgba(126,252,246,0.28)');
      glow.addColorStop(0.42, 'rgba(20,70,76,0.75)');
      glow.addColorStop(1, 'rgba(3,8,13,0.98)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(126,252,246,0.24)';
      context.lineWidth = 1;
      context.beginPath();
      context.ellipse(
        x,
        y - radius * 0.12,
        radius * 1.45,
        radius * 0.3,
        -0.08,
        Math.PI,
        Math.PI * 2,
      );
      context.stroke();
    };

    const drawSun = (time: number) => {
      drawStars(time, 0.24);
      const x = width * 0.12;
      const y = height * 0.78;
      const radius = Math.max(width, height) * 0.3;
      const glow = context.createRadialGradient(x, y, 2, x, y, radius);
      glow.addColorStop(0, 'rgba(255,247,198,0.95)');
      glow.addColorStop(0.08, 'rgba(255,188,75,0.5)');
      glow.addColorStop(0.42, 'rgba(201,133,0,0.1)');
      glow.addColorStop(1, 'rgba(201,133,0,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = 'rgba(201,133,0,0.16)';
      context.beginPath();
      context.ellipse(x, y, radius * 1.4, radius * 0.35, -0.35, 0, Math.PI * 2);
      context.stroke();
    };

    const drawAsteroids = (time: number) => {
      drawStars(time, 0.28);
      const random = seededRandom(41);
      const drift = shouldAnimate ? (time / 90) % (width + 240) : 0;
      for (let i = 0; i < 18; i++) {
        const radius = 5 + random() * 28;
        const baseX = random() * (width + 240) - 120;
        const x =
          ((baseX + drift * (0.15 + random() * 0.25) + width + 240) % (width + 240)) -
          120;
        const y = random() * height;
        context.beginPath();
        for (let point = 0; point < 8; point++) {
          const angle = (point / 8) * Math.PI * 2;
          const edge = radius * (0.7 + random() * 0.3);
          const px = x + Math.cos(angle) * edge;
          const py = y + Math.sin(angle) * edge;
          if (point === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fillStyle = 'rgba(70,86,94,0.3)';
        context.strokeStyle = 'rgba(159,180,188,0.22)';
        context.fill();
        context.stroke();
      }
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (mode === 'galaxy') drawGalaxy(time);
      else if (mode === 'planet-orbit') drawPlanet(time);
      else if (mode === 'star-orbit') drawSun(time);
      else if (mode === 'asteroids') drawAsteroids(time);
      else drawStars(time, mode === 'stars' ? 0.35 : 0.18);
      if (shouldAnimate) frame = requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
      if (!shouldAnimate) draw(0);
    };

    resize();
    window.addEventListener('resize', onResize);
    if (shouldAnimate) frame = requestAnimationFrame(draw);
    else draw(0);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [animated, mode]);

  return (
    <div className={`space-backdrop space-backdrop--${mode}`} aria-hidden="true">
      <canvas ref={canvasRef} className="starfield" />
      {(mode === 'square-grid' || mode === 'perspective-grid') && <span className="backdrop-grid" />}
    </div>
  );
}
