import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavigationConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  selectedNumbers: number[];
  reservationTimeLeft?: number;
}

const NavigationConfirmDialog: React.FC<NavigationConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  selectedNumbers,
  reservationTimeLeft
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md mx-4 rounded-xl bg-white border border-gray-200 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-gray-900 text-center">
            ⚠️ Números Reservados
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-4">
            <div className="text-gray-700">
              Tienes números reservados que se perderán si sales de la página.
            </div>
            
            {/* Números seleccionados */}
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm font-medium text-purple-900 mb-2">
                Números reservados:
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedNumbers.map((num) => (
                  <span 
                    key={num} 
                    className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm px-2 py-1 rounded-lg"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>

            {/* Таймер */}
            {reservationTimeLeft && reservationTimeLeft > 0 && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-900">
                  ⏰ Tiempo restante: {formatTime(reservationTimeLeft)}
                </div>
              </div>
            )}

            <div className="text-gray-600 text-sm">
              ¿Qué deseas hacer?
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={onCancel}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600 rounded-xl"
          >
            🔙 Continuar Reserva
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white rounded-xl"
          >
            ❌ Cancelar y Salir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default NavigationConfirmDialog; 