import { useEffect, useRef } from "react";

const TEXT = "Mujahid";
const FONT_SIZE = 237;
const LETTER_SPACING = -9.6861;
const COLOR = "#1e1e1f";
const W = 1600;
const H = 310;
const GAP = 5;

interface Particle {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  phase: number;
}

export default function ParticleMujahid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    canvas.width = W;
    canvas.height = H;

    let animId: number;
    let active = true;

    document.fonts.ready.then(() => {
      if (!active) return;

      // Sample text pixels on an offscreen canvas
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const octx = off.getContext("2d")!;
      octx.font = `600 ${FONT_SIZE}px "Geist:SemiBold", sans-serif`;
      (octx as any).letterSpacing = `${LETTER_SPACING}px`;
      octx.fillStyle = "#000";
      octx.fillText(TEXT, 0, FONT_SIZE);

      const { data } = octx.getImageData(0, 0, W, H);
      const particles: Particle[] = [];

      for (let y = 0; y < H; y += GAP) {
        for (let x = 0; x < W; x += GAP) {
          if (data[(y * W + x) * 4 + 3] > 128) {
            particles.push({
              x: x + (Math.random() - 0.5) * 700,
              y: y + (Math.random() - 0.5) * 350,
              ox: x,
              oy: y,
              vx: 0,
              vy: 0,
              phase: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      let frame = 0;

      const render = () => {
        if (!active) return;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = COLOR;

        const t = (frame += 1) * 0.012;

        ctx.beginPath();
        particles.forEach((p) => {
          const nx = Math.sin(t + p.phase) * 2.2;
          const ny = Math.cos(t * 0.75 + p.phase * 1.4) * 2.2;

          const dx = p.ox + nx - p.x;
          const dy = p.oy + ny - p.y;
          p.vx = (p.vx + dx * 0.055) * 0.87;
          p.vy = (p.vy + dy * 0.055) * 0.87;
          p.x += p.vx;
          p.y += p.vy;

          ctx.rect(Math.round(p.x), Math.round(p.y), 2, 2);
        });
        ctx.fill();

        animId = requestAnimationFrame(render);
      };

      render();
    });

    return () => {
      active = false;
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: "30.29px",
        top: "312.07px",
        width: `${W}px`,
        height: `${H}px`,
        pointerEvents: "none",
      }}
    />
  );
}
