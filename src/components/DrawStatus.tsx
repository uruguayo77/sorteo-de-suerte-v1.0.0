import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCurrentDraw, formatTimeRemaining, useUpdateDrawStatus } from '@/hooks/use-lottery-draw'
import { Clock, Trophy, Timer, Sparkles } from 'lucide-react'

const DrawStatus = () => {
  const { data: currentDraw, refetch } = useCurrentDraw()
  const updateDrawStatus = useUpdateDrawStatus()
  const [localTimeRemaining, setLocalTimeRemaining] = useState<string>('')

  // Флаг: есть ли активный розыгрыш
  const isActiveDraw = currentDraw && (currentDraw.status === 'scheduled' || currentDraw.status === 'active')

  // Функция для локального времени
  const calculateTimeRemaining = (drawDate: string): string => {
    const now = new Date()
    const target = new Date(drawDate)
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return '00:00:00'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (!currentDraw?.draw_date) return
    const interval = setInterval(() => {
      const timeLeft = calculateTimeRemaining(currentDraw.draw_date)
      setLocalTimeRemaining(timeLeft)
      if (timeLeft === '00:00:00' && currentDraw.status === 'scheduled') {
        updateDrawStatus.mutate()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [currentDraw?.draw_date, currentDraw?.status, updateDrawStatus])

  // Если нет активного розыгрыша — ничего не показываем
  if (!isActiveDraw && !(currentDraw && currentDraw.status === 'finished')) {
    return null
  }

  // Sorteo finalizado - mostrar ganador
  if (currentDraw.status === 'finished' && currentDraw.winner_number) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-3xl p-8 max-w-md w-full text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-6"
            >
              <Trophy className="w-full h-full text-yellow-400" />
            </motion.div>

            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
              ¡Tenemos Ganador!
            </h2>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
              <div className="text-6xl font-bold text-yellow-400 mb-2">
                #{currentDraw.winner_number}
              </div>
              <div className="text-white/90 space-y-1">
                <p className="text-lg font-semibold">{currentDraw.winner_name}</p>
                <p className="text-sm text-white/70">Cédula: {currentDraw.winner_cedula}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
              <p className="text-green-300 font-semibold">
                Premio: {currentDraw.prize_description}
              </p>
            </div>

            <div className="flex justify-center mt-6">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Sorteo activo - esperando resultados
  if (currentDraw.status === 'active') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-md px-4"
      >
        <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 mx-auto mb-3"
          >
            <Timer className="w-full h-full text-orange-400" />
          </motion.div>
          
          <h3 className="text-lg font-bold text-orange-300 mb-2">
            Sorteo en Progreso
          </h3>
          <p className="text-white/80 text-sm">
            Esperando resultados...
          </p>
          <div className="mt-3 text-xs text-orange-300/70">
            {currentDraw.draw_name}
          </div>
        </div>
      </motion.div>
    )
  }

  // Sorteo programado - счетчик
  if (currentDraw.status === 'scheduled') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-md px-4"
      >
        <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 text-center">
          <Clock className="w-8 h-8 mx-auto mb-3 text-blue-400" />
          
          <h3 className="text-lg font-bold text-blue-300 mb-2">
            Esperando Sorteo
          </h3>
          
          <div className="text-4xl font-mono font-bold text-white mb-3 tracking-wider">
            {localTimeRemaining || formatTimeRemaining(currentDraw.time_remaining || '')}
          </div>
          
          <p className="text-white/80 text-sm mb-2">
            {currentDraw.draw_name}
          </p>
          
          <div className="text-sm text-blue-300/90 font-medium">
            ¡El sorteo comenzará muy pronto!
          </div>
        </div>
      </motion.div>
    )
  }

  return null
}

export default DrawStatus 