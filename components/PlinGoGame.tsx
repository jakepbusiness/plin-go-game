'use client';

import { useEffect, useRef, useState } from 'react';

interface PlinGoGameProps {
  rows: number;
  riskLevel: 'low' | 'medium' | 'high';
  isPlaying: boolean;
  onGameResult: (multiplier: number, bet: number) => void;
  betAmount: number;
  selectedSkin?: string;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
}

interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
  multiplier: number;
  color: string;
}

const MULTIPLIERS = {
  low: {
    8: [5, 2, 1.5, 1, 0.5, 1, 1.5, 2, 5],
    12: [10, 3, 2, 1.5, 1, 0.5, 0.5, 1, 1.5, 2, 3, 10],
    16: [25, 5, 3, 2, 1.5, 1, 0.5, 0.3, 0.3, 0.5, 1, 1.5, 2, 3, 5, 25]
  },
  medium: {
    8: [15, 5, 2, 1, 0.5, 1, 2, 5, 15],
    12: [25, 8, 3, 1.5, 1, 0.5, 0.5, 1, 1.5, 3, 8, 25],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]
  },
  high: {
    8: [50, 15, 5, 1, 0.2, 1, 5, 15, 50],
    12: [100, 25, 8, 2, 1, 0.2, 0.2, 1, 2, 8, 25, 100],
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
  }
};

// Helper functions for multiplier display
const getMultiplierColor = (multiplier: number) => {
  if (multiplier >= 100) return 'from-red-600 to-red-700'; // Red for 1K, 130, etc.
  if (multiplier >= 10) return 'from-red-500 to-red-600'; // Red for 26x, 9x, etc.
  if (multiplier >= 2) return 'from-orange-500 to-orange-600'; // Orange for 4x, 2x
  if (multiplier >= 0.5) return 'from-orange-400 to-yellow-500'; // Orange-yellow for 0.2x
  return 'from-yellow-400 to-yellow-500'; // Yellow for center
};

const getMultiplierGradient = (multiplier: number) => {
  if (multiplier >= 1000) return '#dc2626, #b91c1c'; // Deep red for 1K
  if (multiplier >= 100) return '#ef4444, #dc2626'; // Red for 130
  if (multiplier >= 26) return '#f87171, #ef4444'; // Lighter red for 26x
  if (multiplier >= 9) return '#fb7185, #f87171'; // Pink-red for 9x
  if (multiplier >= 4) return '#fb923c, #f97316'; // Orange for 4x
  if (multiplier >= 2) return '#fbbf24, #f59e0b'; // Light orange for 2x
  if (multiplier >= 0.5) return '#fde047, #facc15'; // Yellow-orange for 0.2x
  return '#fef08a, #fde047'; // Bright yellow for center
};

const formatMultiplier = (multiplier: number) => {
  if (multiplier >= 1000) return '1K';
  if (multiplier >= 100) return multiplier.toString();
  return multiplier + 'x';
};

// Helper function to adjust color brightness
const adjustBrightness = (color: string, percent: number) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

export function PlinGoGame({ rows, riskLevel, isPlaying, onGameResult, betAmount, selectedSkin = 'cyberpunk' }: PlinGoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [multipliers, setMultipliers] = useState<number[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pegs, setPegs] = useState<Peg[]>([]);
  const [ball, setBall] = useState<Ball | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'dropping' | 'finished'>('idle');

  // Initialize game board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas for high DPI and crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const pegRadius = 3;
    const slotHeight = 50;
    const topMargin = 80;
    const rowHeight = (height - topMargin - slotHeight) / rows;

    // Generate multipliers
    const currentMultipliers = MULTIPLIERS[riskLevel][rows as keyof typeof MULTIPLIERS[typeof riskLevel]];
    setMultipliers(currentMultipliers);

    // Generate slots with exact colors from reference
    const slotWidth = width / currentMultipliers.length;
    const newSlots: Slot[] = currentMultipliers.map((multiplier, index) => {
      let color = '#dc2626'; // Deep Red for high multipliers
      if (multiplier >= 10 && multiplier < 50) {
        color = '#ea580c'; // Vibrant Orange for medium multipliers
      } else if (multiplier < 1) {
        color = '#eab308'; // Bright Yellow for low multipliers
      } else if (multiplier >= 1 && multiplier < 10) {
        color = '#ea580c'; // Vibrant Orange for medium multipliers
      }
      
      return {
        x: index * slotWidth,
        y: height - slotHeight,
        width: slotWidth,
        height: slotHeight,
        multiplier,
        color
      };
    });
    setSlots(newSlots);

    // Generate pegs in triangular pattern
    const newPegs: Peg[] = [];
    for (let row = 0; row < rows; row++) {
      const pegsInRow = row + 1;
      const rowY = topMargin + row * rowHeight;
      const rowWidth = (pegsInRow - 1) * (width / (rows + 1));
      const startX = centerX - rowWidth / 2;

      for (let col = 0; col < pegsInRow; col++) {
        newPegs.push({
          x: startX + col * (width / (rows + 1)),
          y: rowY,
          radius: pegRadius
        });
      }
    }
    setPegs(newPegs);
  }, [rows, riskLevel]);

  // Handle ball drop
  useEffect(() => {
    if (isPlaying && gameState === 'idle') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const centerX = width / 2;

      const newBall: Ball = {
        x: centerX + (Math.random() - 0.5) * 40, // Slight randomization
        y: 50,
        vx: 0,
        vy: 0,
        radius: 8, // Increased radius for better visibility
        color: '#ffffff'
      };

      setBall(newBall);
      setGameState('dropping');
    }
  }, [isPlaying, gameState]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gravity = 0.3;
    const friction = 0.98;
    const bounce = 0.7;

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background with enhanced skin-based gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (selectedSkin === 'cyberpunk') {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#0f3460');
        gradient.addColorStop(1, '#16213e');
      } else if (selectedSkin === 'golden') {
        gradient.addColorStop(0, '#2d1b1b');
        gradient.addColorStop(0.3, '#92400e');
        gradient.addColorStop(0.7, '#fbbf24');
        gradient.addColorStop(1, '#92400e');
      } else if (selectedSkin === 'neon') {
        gradient.addColorStop(0, '#1e1e3f');
        gradient.addColorStop(0.3, '#4c1d95');
        gradient.addColorStop(0.7, '#7c3aed');
        gradient.addColorStop(1, '#1e1e3f');
      } else if (selectedSkin === 'crystal') {
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(0.3, '#1e293b');
        gradient.addColorStop(0.7, '#0ea5e9');
        gradient.addColorStop(1, '#0f172a');
      } else if (selectedSkin === 'whop-elite') {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.3, '#dc2626');
        gradient.addColorStop(0.7, '#ea580c');
        gradient.addColorStop(1, '#1a1a2e');
      } else if (selectedSkin === 'diamond') {
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(0.3, '#1e293b');
        gradient.addColorStop(0.7, '#e0e7ff');
        gradient.addColorStop(1, '#0f172a');
      } else {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw slots with enhanced skin-based styling
      slots.forEach(slot => {
        // Get skin-specific colors
        let slotColor = slot.color;
        let borderColor = adjustBrightness(slot.color, 30);
        
        if (selectedSkin === 'golden') {
          if (slot.multiplier >= 10) {
            slotColor = '#fbbf24'; // Golden for high multipliers
            borderColor = '#f59e0b';
          } else if (slot.multiplier >= 1) {
            slotColor = '#92400e'; // Dark gold for medium
            borderColor = '#78350f';
          } else {
            slotColor = '#451a03'; // Dark brown for low
            borderColor = '#292524';
          }
        } else if (selectedSkin === 'cyberpunk') {
          if (slot.multiplier >= 10) {
            slotColor = '#dc2626'; // Deep Red for high multipliers
            borderColor = '#b91c1c';
          } else if (slot.multiplier >= 1) {
            slotColor = '#ea580c'; // Vibrant Orange for medium
            borderColor = '#dc2626';
          } else {
            slotColor = '#eab308'; // Bright Yellow for low
            borderColor = '#ca8a04';
          }
        } else if (selectedSkin === 'neon') {
          if (slot.multiplier >= 10) {
            slotColor = '#7c3aed'; // Purple for high multipliers
            borderColor = '#6d28d9';
          } else if (slot.multiplier >= 1) {
            slotColor = '#4c1d95'; // Dark purple for medium
            borderColor = '#3730a3';
          } else {
            slotColor = '#1e1e3f'; // Dark blue for low
            borderColor = '#312e81';
          }
        } else if (selectedSkin === 'crystal') {
          if (slot.multiplier >= 10) {
            slotColor = '#0ea5e9'; // Blue for high multipliers
            borderColor = '#0284c7';
          } else if (slot.multiplier >= 1) {
            slotColor = '#0369a1'; // Dark blue for medium
            borderColor = '#075985';
          } else {
            slotColor = '#0f172a'; // Dark for low
            borderColor = '#1e293b';
          }
        } else if (selectedSkin === 'whop-elite') {
          if (slot.multiplier >= 10) {
            slotColor = '#ea580c'; // Orange for high multipliers
            borderColor = '#dc2626';
          } else if (slot.multiplier >= 1) {
            slotColor = '#dc2626'; // Red for medium
            borderColor = '#b91c1c';
          } else {
            slotColor = '#991b1b'; // Dark red for low
            borderColor = '#7f1d1d';
          }
        } else if (selectedSkin === 'diamond') {
          if (slot.multiplier >= 10) {
            slotColor = '#e0e7ff'; // Light blue for high multipliers
            borderColor = '#c7d2fe';
          } else if (slot.multiplier >= 1) {
            slotColor = '#6366f1'; // Indigo for medium
            borderColor = '#4f46e5';
          } else {
            slotColor = '#1e293b'; // Dark for low
            borderColor = '#0f172a';
          }
        }
        
        // Create gradient for slot
        const slotGradient = ctx.createLinearGradient(slot.x, slot.y, slot.x, slot.y + slot.height);
        slotGradient.addColorStop(0, slotColor);
        slotGradient.addColorStop(1, adjustBrightness(slotColor, -20));
        
        ctx.fillStyle = slotGradient;
        ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
        
        // Add border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);
        
        // Draw multiplier text with crisp rendering
        ctx.imageSmoothingEnabled = false;
        
        // Clear any existing shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw text with crisp rendering
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const multiplierText = slot.multiplier >= 100 ? slot.multiplier.toString() : `${slot.multiplier}x`;
        
        // Draw text outline for better visibility
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(multiplierText, slot.x + slot.width / 2, slot.y + slot.height / 2);
        
        // Draw main text
        ctx.fillText(multiplierText, slot.x + slot.width / 2, slot.y + slot.height / 2);
      });

      // Draw pegs with skin-specific styling
      pegs.forEach(peg => {
        // Get skin-specific peg colors
        let pegColor = '#ffffff';
        let glowColor = '#ffffff';
        
        if (selectedSkin === 'golden') {
          pegColor = '#fbbf24';
          glowColor = '#f59e0b';
        } else if (selectedSkin === 'cyberpunk') {
          pegColor = '#ffffff';
          glowColor = '#ffffff';
        } else if (selectedSkin === 'neon') {
          pegColor = '#7c3aed';
          glowColor = '#6d28d9';
        } else if (selectedSkin === 'crystal') {
          pegColor = '#0ea5e9';
          glowColor = '#0284c7';
        } else if (selectedSkin === 'whop-elite') {
          pegColor = '#ea580c';
          glowColor = '#dc2626';
        } else if (selectedSkin === 'diamond') {
          pegColor = '#e0e7ff';
          glowColor = '#c7d2fe';
        }
        
        // Create gradient for peg
        const pegGradient = ctx.createRadialGradient(peg.x, peg.y, 0, peg.x, peg.y, peg.radius);
        pegGradient.addColorStop(0, pegColor);
        pegGradient.addColorStop(1, adjustBrightness(pegColor, -20));
        
        ctx.fillStyle = pegGradient;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = pegColor;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Update and draw ball
      if (ball && gameState === 'dropping') {
        // Apply gravity
        ball.vy += gravity;
        ball.vx *= friction;

        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Check peg collisions
        pegs.forEach(peg => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = ball.radius + peg.radius;

          if (distance < minDistance) {
            // Collision response
            const angle = Math.atan2(dy, dx);
            const targetX = peg.x + Math.cos(angle) * minDistance;
            const targetY = peg.y + Math.sin(angle) * minDistance;

            ball.x = targetX;
            ball.y = targetY;

            // Bounce with slight randomization
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const randomAngle = angle + (Math.random() - 0.5) * 0.5;
            
            ball.vx = Math.cos(randomAngle) * speed * bounce;
            ball.vy = Math.sin(randomAngle) * speed * bounce;
          }
        });

        // Check if ball reached bottom
        const rect = canvas.getBoundingClientRect();
        if (ball.y > rect.height - 60) {
          // Find which slot the ball landed in
          const slotIndex = Math.floor(ball.x / (rect.width / slots.length));
          const slot = slots[Math.max(0, Math.min(slotIndex, slots.length - 1))];
          
          // Trigger win effect
          if (slot.multiplier >= 10) {
            createParticleEffect(ball.x, ball.y);
          }
          
          // Play sound effect
          playSound(slot.multiplier);
          
          // Call result callback
          setTimeout(() => {
            onGameResult(slot.multiplier, betAmount);
            setGameState('finished');
            setBall(null);
            setTimeout(() => setGameState('idle'), 1000);
          }, 500);
        }

        // Draw ball with simple styling
        ctx.fillStyle = '#ff0000'; // Bright red for visibility
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a border to make it more visible
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add glow effect
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ball, gameState, pegs, slots, onGameResult, betAmount, selectedSkin]);

  const createParticleEffect = (x: number, y: number) => {
    // Simple particle effect for big wins
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const particle = {
          x: x + (Math.random() - 0.5) * 100,
          y: y + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 1
        };

        const animateParticle = () => {
          if (particle.life <= 0) return;

          ctx.fillStyle = `rgba(251, 191, 36, ${particle.life})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
          ctx.fill();

          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= 0.02;

          if (particle.life > 0) {
            requestAnimationFrame(animateParticle);
          }
        };

        animateParticle();
      }, i * 50);
    }
  };

  const playSound = (multiplier: number) => {
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequency = multiplier >= 10 ? 800 : multiplier >= 5 ? 600 : 400;
    const duration = multiplier >= 10 ? 0.5 : 0.3;

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Game Canvas */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          className="w-full h-full border border-gray-600 rounded-lg"
          style={{
            imageRendering: 'crisp-edges'
          }}
        />
      </div>
    </div>
  );
}
