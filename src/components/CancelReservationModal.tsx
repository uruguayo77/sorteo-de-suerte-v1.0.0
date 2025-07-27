import React from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CancelReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  reservedNumbers: number[]
  timeRemaining: string
  isLoading?: boolean
}

export function CancelReservationModal({
  isOpen,
  onClose,
  onConfirm,
  reservedNumbers,
  timeRemaining,
  isLoading = false
}: CancelReservationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg md:max-w-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-2xl mx-auto">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="flex items-center justify-center sm:justify-start gap-2 text-orange-400 font-bold text-lg sm:text-xl">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
            ¿Cancelar reservación?
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-sm sm:text-base text-center sm:text-left">
            Estás a punto de cancelar tu reservación actual de números. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
          <div className="bg-gradient-to-r from-blue-500/20 via-blue-600/20 to-blue-700/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              <span className="text-blue-300 font-semibold text-sm sm:text-base">Información de Reservación</span>
            </div>
            <div className="space-y-3">
              <div className="text-center sm:text-left">
                <span className="text-blue-200 font-semibold text-sm sm:text-base block mb-2">Números reservados:</span>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {reservedNumbers.map((num) => (
                    <span key={num} className="inline-block bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-300 font-bold text-base sm:text-lg px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-purple-400/40 shadow-lg">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-blue-200 text-center sm:text-left text-sm sm:text-base">
                <strong>Tiempo restante:</strong> {timeRemaining}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/20 via-orange-600/20 to-orange-700/20 backdrop-blur-sm border border-orange-500/30 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
              <span className="text-orange-300 font-semibold text-sm sm:text-base">Advertencia</span>
            </div>
            <p className="text-orange-200 text-xs sm:text-sm text-center sm:text-left">
              Al cancelar, estos números estarán disponibles inmediatamente para otros usuarios.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all duration-200 text-sm sm:text-base py-2 sm:py-2 rounded-xl"
          >
            No, mantener reservación
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg transition-all duration-200 text-sm sm:text-base py-2 sm:py-2 rounded-xl"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Cancelando...
              </>
            ) : (
              'Sí, cancelar reservación'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 