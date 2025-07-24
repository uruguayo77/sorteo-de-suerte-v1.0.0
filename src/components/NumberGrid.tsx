import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBlockedNumbers } from "@/hooks/use-supabase";
import { Loader2 } from "lucide-react";
// import { useCurrentDraw } from '@/hooks/use-lottery-draw' // больше не нужен

interface NumberGridProps {
  selectedNumbers: number[];
  onNumberSelect: (number: number) => void;
}

const NumberGrid = ({ selectedNumbers, onNumberSelect }: NumberGridProps) => {
  const { data: blockedNumbers, isLoading, error } = useBlockedNumbers();
  // const { data: currentDraw } = useCurrentDraw()
  // const isActiveDraw = currentDraw && (currentDraw.status === 'scheduled' || currentDraw.status === 'active')
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  // Добавляем логирование для диагностики
  console.log('NumberGrid state:', { blockedNumbers, isLoading, error });

  const getNumberStatus = (number: number) => {
    if (blockedNumbers?.has(number)) return 'blocked';
    if (selectedNumbers.includes(number)) return 'selected';
    return 'available';
  };

  const getNumberStyles = (status: string) => {
    switch (status) {
      case 'blocked':
        return 'bg-red-500 text-white border border-red-600 rounded-lg cursor-not-allowed opacity-60';
      case 'selected':
        // Всегда фиолетовая, без эффекта нажатия/outline/ring
        return 'bg-purple-600 text-white border border-purple-700 rounded-lg shadow-lg scale-105 focus:outline-none focus:ring-0 active:bg-purple-600';
      case 'available':
      default:
        return 'bg-white/10 backdrop-blur-sm text-gray-800 border border-gray-300 rounded-lg';
    }
  };

  const handleNumberClick = (number: number) => {
    const status = getNumberStatus(number);
    
    if (status === 'blocked') return;
    
    if (status === 'selected') {
      // Если номер уже выбран, отменяем выбор
      onNumberSelect(number);
    } else {
      // Если номер доступен, выбираем его
      onNumberSelect(number);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-300 text-lg">Cargando números...</span>
      </div>
    );
  }

  if (error) {
    console.error('NumberGrid error:', error);
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-lg">Error al cargar los números</p>
        <p className="text-sm text-gray-400 mt-3">Por favor, recarga la página</p>
        <p className="text-xs text-gray-500 mt-2">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-32">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Selecciona tus números</h2>
        <p className="text-gray-300">Haz clic en los números que deseas reservar</p>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 sm:gap-4">
        {numbers.map((number) => {
          const status = getNumberStatus(number);
          
          return (
            <Button
              key={number}
              className={`aspect-square text-sm sm:text-base font-bold relative min-h-[3rem] sm:min-h-[3.5rem] transition-all duration-200 ${getNumberStyles(status)}`}
              onClick={() => handleNumberClick(number)}
              disabled={status === 'blocked'}
            >
              {number}
            </Button>
          );
        })}
              </div>
      </div>
    );
  };

export default NumberGrid;