import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  state: 'idle' | 'listening' | 'speaking' | 'thinking';
  analyserNode?: AnalyserNode | null;
  speechRate?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  state,
  analyserNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;
    const dataArray = new Uint8Array(64);

    const render = () => {
      phase += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      let amplitude = 8;
      if (state === 'speaking') {
        amplitude = 26 + Math.sin(phase * 2.8) * 12;
      } else if (state === 'listening') {
        if (analyserNode) {
          analyserNode.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
          amplitude = Math.max(14, avg * 0.55);
        } else {
          amplitude = 22 + Math.sin(phase * 3.5) * 10;
        }
      } else if (state === 'thinking') {
        amplitude = 12 + Math.sin(phase * 1.8) * 5;
      }

      // 1. Subtle radial background glow with electric cyan & ultraviolet
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        centerY,
        4,
        width / 2,
        centerY,
        width * 0.45
      );
      if (state === 'speaking') {
        bgGrad.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
        bgGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.12)');
        bgGrad.addColorStop(1, 'transparent');
      } else if (state === 'listening') {
        bgGrad.addColorStop(0, 'rgba(34, 211, 238, 0.32)');
        bgGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
        bgGrad.addColorStop(1, 'transparent');
      } else if (state === 'thinking') {
        bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
        bgGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.08)');
        bgGrad.addColorStop(1, 'transparent');
      } else {
        bgGrad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
        bgGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal centerline
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Harmonic waveform layers with Electric Cyan & Ultraviolet
      const layers = [
        {
          color:
            state === 'speaking'
              ? 'rgba(6, 182, 212, 0.95)' // Electric Cyan
              : state === 'listening'
              ? 'rgba(34, 211, 238, 0.95)' // Bright Cyan
              : state === 'thinking'
              ? 'rgba(245, 158, 11, 0.9)' // Amber
              : 'rgba(34, 211, 238, 0.35)',
          freq: 0.022,
          ampMult: 1.0,
          speed: 1.0,
          lineWidth: 2.4,
          glow: 'rgba(6, 182, 212, 0.8)',
        },
        {
          color:
            state === 'speaking'
              ? 'rgba(139, 92, 246, 0.8)' // Ultraviolet
              : state === 'listening'
              ? 'rgba(16, 185, 129, 0.8)' // Emerald Mint
              : state === 'thinking'
              ? 'rgba(239, 68, 68, 0.7)' // Coral
              : 'rgba(139, 92, 246, 0.25)',
          freq: 0.034,
          ampMult: 0.68,
          speed: -1.2,
          lineWidth: 1.8,
          glow: 'rgba(139, 92, 246, 0.6)',
        },
        {
          color:
            state === 'speaking'
              ? 'rgba(34, 211, 238, 0.6)' // Luminous Cyan
              : state === 'listening'
              ? 'rgba(6, 182, 212, 0.6)'
              : state === 'thinking'
              ? 'rgba(251, 191, 36, 0.5)'
              : 'rgba(6, 182, 212, 0.18)',
          freq: 0.015,
          ampMult: 0.82,
          speed: 0.7,
          lineWidth: 1.5,
          glow: 'rgba(34, 211, 238, 0.4)',
        },
      ];

      layers.forEach(layer => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.lineWidth;
        ctx.shadowColor = layer.glow;
        ctx.shadowBlur = state === 'speaking' || state === 'listening' ? 10 : 4;

        for (let x = 0; x < width; x++) {
          const envelope = Math.sin((x / width) * Math.PI); // Window function
          const y =
            centerY +
            Math.sin(x * layer.freq + phase * layer.speed) *
              amplitude *
              layer.ampMult *
              envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.restore();
      });

      // 3. Central pulsing harmonic frequency dots
      const numDots = 7;
      const dotSpacing = 16;
      const startX = width / 2 - ((numDots - 1) * dotSpacing) / 2;

      for (let i = 0; i < numDots; i++) {
        const x = startX + i * dotSpacing;
        const dotOffset = Math.sin(phase * 3 + i * 0.8) * (amplitude * 0.28);
        const y = centerY + dotOffset;
        const radius =
          state === 'speaking' || state === 'listening'
            ? 2.8 + Math.sin(phase * 4 + i) * 1.4
            : 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.2, radius), 0, Math.PI * 2);
        ctx.fillStyle =
          state === 'speaking'
            ? '#22d3ee'
            : state === 'listening'
            ? '#06b6d4'
            : state === 'thinking'
            ? '#fbbf24'
            : 'rgba(34, 211, 238, 0.35)';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, analyserNode]);

  return (
    <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-[#03060f] border border-cyan-500/25 backdrop-blur-xl shadow-[inset_0_0_25px_rgba(6,182,212,0.12)]">
      <canvas
        ref={canvasRef}
        width={540}
        height={128}
        className="w-full h-full block"
      />
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-md border border-cyan-500/30 bg-[#070d1d]/90 text-cyan-300 shadow-sm">
        <span
          className={`w-2 h-2 rounded-full ${
            state === 'speaking'
              ? 'bg-cyan-400 animate-ping shadow-[0_0_8px_#22d3ee]'
              : state === 'listening'
              ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
              : state === 'thinking'
              ? 'bg-amber-400 animate-spin shadow-[0_0_8px_#fbbf24]'
              : 'bg-slate-500'
          }`}
        />
        <span className="uppercase tracking-wider">
          {state === 'speaking'
            ? 'Tutor Voice Active'
            : state === 'listening'
            ? 'Listening to Learner'
            : state === 'thinking'
            ? 'Socratic Reasoning'
            : 'Voice Standby'}
        </span>
      </div>
    </div>
  );
};
