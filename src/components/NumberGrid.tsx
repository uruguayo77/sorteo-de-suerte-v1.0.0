import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOccupiedNumbers } from "@/hooks/use-supabase";
import { Loader2 } from "lucide-react";

interface NumberGridProps {
  selectedNumbers: number[];
  onNumberSelect: (number: number) => void;
}

const NumberGrid = ({ selectedNumbers, onNumberSelect }: NumberGridProps) => {
  const { data: occupiedNumbers, isLoading, error } = useOccupiedNumbers();
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-700 text-lg">Cargando números...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-lg">Error al cargar los números</p>
        <p className="text-sm text-gray-600 mt-3">Por favor, recarga la página</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Selecciona tus números</h2>
        <p className="text-gray-600">Haz clic en los números que deseas reservar</p>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 sm:gap-4">
        {numbers.map((number) => {
          const isOccupied = occupiedNumbers?.has(number) || false;
          const isSelected = selectedNumbers.includes(number);
          
          return (
            <Button
              key={number}
              variant={
                isOccupied 
                  ? "ocupado" 
                  : isSelected 
                    ? "disponible" 
                    : "number"
              }
              size="sm"
              className="aspect-square text-sm sm:text-base font-bold relative min-h-[3rem] sm:min-h-[3.5rem]"
              onClick={() => !isOccupied && onNumberSelect(number)}
              disabled={isOccupied}
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