import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock, X, AlertTriangle } from 'lucide-react'
import { useTemporaryReservationStatus, useCancelTemporaryReservation } from '@/hooks/use-supabase'
import { CancelReservationModal } from './CancelReservationModal'
import { toast } from 'sonner'

interface ReservationTimerProps {
  reservationId: string | null
  selectedNumbers: number[]
  onCanceled?: () => void
  onNavigationCleanup?: () => void
}

export function ReservationTimer({ reservationId, selectedNumbers, onCanceled, onNavigationCleanup }: ReservationTimerProps) {
  const { data: reservation, isLoading, error } = useTemporaryReservationStatus(reservationId || undefined)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const cancelReservation = useCancelTemporaryReservation()

  // Отладочная информация для диагностики
  console.log('ReservationTimer render:', {
    reservationId,
    selectedNumbers,
    hasOnCanceled: !!onCanceled,
    reservation,
    isLoading,
    error
  });

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
        
        // Limpiar estado de navegación
        if (onNavigationCleanup) {
          onNavigationCleanup()
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
    // Отладочная информация
    console.log('ReservationTimer: No reservation data', {
      reservationId,
      reservation,
      selectedNumbers,
      isLoading
    });
    
    // Если есть reservationId и идет загрузка, показываем индикатор
    if (reservationId && isLoading) {
      return (
        <Alert className="mb-4 border-blue-500/30 bg-blue-500/10">
          <Clock className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Cargando información de reservación...</span>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    // Если есть reservationId но нет данных и загрузка завершена, показываем ошибку
    if (reservationId && !isLoading && selectedNumbers.length > 0) {
      return (
        <Alert className="mb-4 border-yellow-500/30 bg-yellow-500/10">
          <Clock className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">
            <span>No se pudo cargar la información de reservación. Los números pueden seguir reservados.</span>
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
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
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold">¡Reserva Expirada!</span>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-400 block mb-1">Números que estaban reservados:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedNumbers.map((num) => (
                    <span key={num} className="inline-block bg-red-500/20 text-red-400 font-bold text-base sm:text-lg px-2 py-1 rounded-lg border border-red-500/30">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm">Ya no están reservados. Selecciona números nuevamente para hacer otra reserva.</p>
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onCanceled && onCanceled()
                    onNavigationCleanup && onNavigationCleanup()
                  }}
                  className="bg-purple-600/20 border-purple-400/40 text-purple-300 hover:bg-purple-600/30 hover:text-purple-200 px-6 py-2 font-semibold"
                >
                  Volver a seleccionar números
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Versión móvil - Layout vertical */}
            <div className="block sm:hidden space-y-3">
              <div>
                <span className="text-sm text-gray-400 block mb-2">Números reservados:</span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {selectedNumbers.map((num) => (
                    <span key={num} className="inline-block bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-300 font-bold text-lg px-3 py-2 rounded-xl border border-purple-400/40 shadow-lg">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-600/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className={`font-mono text-lg font-bold ${
                    isAlmostExpired ? 'animate-pulse text-yellow-400' : 'text-blue-300'
                  }`}>
                    {timeLeft}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="bg-gradient-to-r from-gray-600/20 to-gray-700/20 border-gray-500/40 text-gray-300 hover:from-gray-500/30 hover:to-gray-600/30 hover:border-gray-400/60 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm rounded-xl"
                  disabled={cancelReservation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Versión desktop - Layout horizontal */}
            <div className="hidden sm:block">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-semibold mr-2">Números reservados:</span>
                  {selectedNumbers.map((num) => (
                    <span key={num} className="inline-block bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-300 font-bold text-xl px-3 py-1 rounded-xl border border-purple-400/40 shadow-lg transform scale-105 hover:scale-110 transition-transform duration-200">
                      {num}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`font-mono text-lg font-bold ${
                    isAlmostExpired ? 'animate-pulse' : ''
                  }`}>
                    {timeLeft}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelModal(true)}
                    className="bg-gradient-to-r from-gray-600/20 to-gray-700/20 border-gray-500/40 text-gray-300 hover:from-gray-500/30 hover:to-gray-600/30 hover:border-gray-400/60 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm rounded-xl"
                    disabled={cancelReservation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
            
            <p className="text-sm mt-3 text-center sm:text-left">
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