import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, X } from 'lucide-react'
import { useTemporaryReservationStatus, useCancelTemporaryReservation } from '@/hooks/use-supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CancelReservationModal } from './CancelReservationModal'
import { toast } from 'sonner'

interface ReservationTimerProps {
  reservationId: string | null
  selectedNumbers: number[]
  onCanceled?: () => void
}

export function ReservationTimer({ reservationId, selectedNumbers, onCanceled }: ReservationTimerProps) {
  const { data: reservation } = useTemporaryReservationStatus(reservationId || undefined)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const cancelReservation = useCancelTemporaryReservation()

  useEffect(() => {
    if (!reservation?.reserved_until) return

    const updateTimer = () => {
      const reservedUntil = new Date(reservation.reserved_until!)
      const now = new Date()
      const timeDiff = reservedUntil.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setTimeLeft('EXPIRADO')
        return
      }

      const minutes = Math.floor(timeDiff / 60000)
      const seconds = Math.floor((timeDiff % 60000) / 1000)
      
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [reservation?.reserved_until])

  const handleCancelConfirm = async () => {
    if (!reservationId) return

    try {
      const result = await cancelReservation.mutateAsync(reservationId)
      
      if (result.success) {
        toast.success('Reservación cancelada exitosamente')
        toast.info(`Números liberados: ${result.freed_numbers.join(', ')}`)
        setShowCancelModal(false)
        
        // Llamar el callback para regresar a la pantalla principal
        if (onCanceled) {
          onCanceled()
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error canceling reservation:', error)
      toast.error('Error al cancelar la reservación')
    }
  }

  if (!reservation || !reservation.reserved_until) {
    return null
  }

  const isExpired = reservation.isExpired || timeLeft === 'EXPIRADO'
  const isAlmostExpired = reservation.minutesRemaining <= 2

  return (
    <Alert className={`mb-4 ${
      isExpired 
        ? 'border-red-500/30 bg-red-500/10' 
        : isAlmostExpired 
          ? 'border-yellow-500/30 bg-yellow-500/10'
          : 'border-blue-500/30 bg-blue-500/10'
    }`}>
      <Clock className={`h-4 w-4 ${
        isExpired 
          ? 'text-red-400' 
          : isAlmostExpired 
            ? 'text-yellow-400'
            : 'text-blue-400'
      }`} />
      <AlertDescription className={
        isExpired 
          ? 'text-red-200' 
          : isAlmostExpired 
            ? 'text-yellow-200'
            : 'text-blue-200'
      }>
        {isExpired ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold">¡Reserva Expirada!</span>
            </div>
            <p>Los números {selectedNumbers.join(', ')} ya no están reservados.</p>
            <p className="text-sm mt-1">Selecciona números nuevamente para hacer otra reserva.</p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                Números reservados: {selectedNumbers.join(', ')}
              </span>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-lg font-bold ${
                  isAlmostExpired ? 'animate-pulse' : ''
                }`}>
                  {timeLeft}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                  disabled={cancelReservation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
            <p className="text-sm mt-1">
              {isAlmostExpired 
                ? '⚠️ ¡Tiempo casi agotado! Completa tu pago rápidamente.'
                : 'Tienes tiempo para completar el pago. Puedes cancelar la reservación en cualquier momento.'
              }
            </p>
          </>
        )}
      </AlertDescription>

      {/* Modal de confirmación de cancelación */}
      <CancelReservationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        reservedNumbers={selectedNumbers}
        timeRemaining={timeLeft}
        isLoading={cancelReservation.isPending}
      />
    </Alert>
  )
} 