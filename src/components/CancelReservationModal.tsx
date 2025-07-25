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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            ¿Cancelar reservación?
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Estás a punto de cancelar tu reservación actual de números. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-1">
                <div><strong>Números reservados:</strong> {reservedNumbers.join(', ')}</div>
                <div><strong>Tiempo restante:</strong> {timeRemaining}</div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Advertencia:</strong> Al cancelar, estos números estarán disponibles inmediatamente para otros usuarios.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            No, mantener reservación
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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