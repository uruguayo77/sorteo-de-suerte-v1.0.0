import React from 'react';

interface NumberDisplayProps {
  numbers: number[];
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'expired';
  className?: string;
}

const NumberDisplay: React.FC<NumberDisplayProps> = ({ 
  numbers, 
  size = 'md', 
  variant = 'default', 
  className = '' 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-base px-2 py-1';
      case 'md':
        return 'text-lg px-3 py-2';
      case 'lg':
        return 'text-lg sm:text-xl px-3 py-2';
      default:
        return 'text-lg px-3 py-2';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 border-green-400/40';
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'default':
      default:
        return 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-300 border-purple-400/40';
    }
  };

  const baseClasses = 'inline-block font-bold rounded-xl border shadow-lg';
  const sizeClasses = getSizeClasses();
  const variantClasses = getVariantClasses();

  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      {numbers.map((num) => (
        <span 
          key={num} 
          className={`${baseClasses} ${sizeClasses} ${variantClasses}`}
        >
          {num}
        </span>
      ))}
    </div>
  );
};

export default NumberDisplay; 