import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  friction: number;
  trail: { x: number; y: number }[];
  trailLength: number;
  sparkle: boolean;
}

interface Rocket {
  x: number;
  y: number;
  tx: number; // target y
  ty: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

export const FireworksOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles: Particle[] = [];
    let rockets: Rocket[] = [];

    const colors = [
      "hsl(38, 95%, 55%)",  // Gold
      "hsl(350, 95%, 55%)", // Red/Pink
      "hsl(190, 100%, 55%)", // Cyan
      "hsl(145, 90%, 50%)",  // Emerald
      "hsl(280, 100%, 65%)", // Magenta/Purple
      "hsl(25, 100%, 55%)",  // Orange
      "hsl(300, 100%, 60%)"  // Hot Pink
    ];

    const resize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);

    const createExplosion = (x: number, y: number, color: string) => {
      const particleCount = 120 + Math.floor(Math.random() * 60); // Incredibly rich and full particles
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Varying speed for double-ring or layered bloom effect
        const speed = Math.random() * 8 + 2; 
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          decay: 0.008 + Math.random() * 0.012, // Slightly slower decay for lingering glory
          gravity: 0.08,
          friction: 0.95 + Math.random() * 0.02,
          trail: [],
          trailLength: 6 + Math.floor(Math.random() * 6),
          sparkle: Math.random() > 0.4,
        });
      }

      // Add a secondary ring of white/sparkle particles for extra sparkle
      const sparkleCount = 30;
      for (let i = 0; i < sparkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 4;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: "255, 255, 255", // Handle raw white sparkles separately in draw
          alpha: 1,
          decay: 0.015 + Math.random() * 0.02,
          gravity: 0.1,
          friction: 0.93,
          trail: [],
          trailLength: 4,
          sparkle: true,
        });
      }
    };

    const triggerRocket = (startX: number = Math.random() * width, targetY: number = height * 0.15 + Math.random() * (height * 0.4)) => {
      const targetX = startX + (Math.random() * 100 - 50);
      const dy = targetY - height;
      const dx = targetX - startX;
      const steps = 40 + Math.floor(Math.random() * 20);
      const vx = dx / steps;
      const vy = dy / steps;
      const color = colors[Math.floor(Math.random() * colors.length)];

      rockets.push({
        x: startX,
        y: height,
        tx: targetX,
        ty: targetY,
        vx,
        vy,
        color,
        alpha: 1,
      });
    };

    const handleTriggerFireworksEvent = () => {
      // 1. Immediately spawn 4-5 glorious instantaneous bursts in the upper-mid area of screen
      const delayTimes = [0, 150, 300, 450, 600];
      delayTimes.forEach((delay, index) => {
        setTimeout(() => {
          const rx = width * 0.2 + Math.random() * (width * 0.6);
          const ry = height * 0.2 + Math.random() * (height * 0.35);
          const randColor = colors[Math.floor(Math.random() * colors.length)];
          createExplosion(rx, ry, randColor);
        }, delay);
      });

      // 2. Launch 4 rockets that fly up and burst beautifully
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const startX = width * 0.15 + (i * (width * 0.7)) / 3 + (Math.random() * 40 - 20);
          triggerRocket(startX);
        }, i * 200 + 100);
      }
    };

    // Export trigger event listener to window
    window.addEventListener("trigger-fireworks", handleTriggerFireworksEvent);

    const updateAndRender = () => {
      // Create trailing glow in the background canvas rather than fully wiping
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)"; // Keeps a dark fading tail for fireworks
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      // 1. Update & Render Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;

        // Sparkle tail behind rocket
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - r.vx * 3, r.y - r.vy * 3);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Check if rocket has reached or passed its target Y coordinate
        if (r.vy >= 0 || r.y <= r.ty) {
          createExplosion(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      // 2. Update & Render Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        
        // Save trail history
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > p.trailLength) {
          p.trail.shift();
        }

        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Draw Trail with varying width and opacity
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let j = 1; j < p.trail.length; j++) {
            ctx.lineTo(p.trail[j].x, p.trail[j].y);
          }
          ctx.strokeStyle = p.color.startsWith("hsl")
            ? p.color.replace(")", `, ${p.alpha})`).replace("hsl", "hsla")
            : `rgba(${p.color}, ${p.alpha})`;
          ctx.lineWidth = 1.8 * p.alpha;
          ctx.stroke();
        }

        // Render sparkly core
        ctx.beginPath();
        const displayColor = p.color.startsWith("hsl")
          ? p.color.replace(")", `, ${p.alpha})`).replace("hsl", "hsla")
          : `rgba(${p.color}, ${p.alpha})`;
        ctx.arc(p.x, p.y, (p.sparkle ? 2 : 1.2) * p.alpha, 0, Math.PI * 2);
        ctx.fillStyle = displayColor;
        ctx.fill();

        // Random twinkle sparkle
        if (p.sparkle && Math.random() > 0.75) {
          ctx.beginPath();
          ctx.arc(p.x + (Math.random() * 6 - 3), p.y + (Math.random() * 6 - 3), 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.9})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(updateAndRender);
    };

    updateAndRender();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("trigger-fireworks", handleTriggerFireworksEvent);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[999] bg-transparent"
    />
  );
};
