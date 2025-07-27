import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiEffectProps {
  trigger: boolean;
  colors?: string[];
  duration?: number;
}

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ 
  trigger, 
  colors = ['#9333ea', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
  duration = 3000 
}) => {
  useEffect(() => {
    if (!trigger) return;

    const shootConfetti = () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors,
        gravity: 0.8,
        scalar: 1.2
      });
    };

    // Запускаем конфетти несколько раз
    shootConfetti();
    
    const interval = setInterval(shootConfetti, 500);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [trigger, colors, duration]);

  return null;
};

export default ConfettiEffect; 