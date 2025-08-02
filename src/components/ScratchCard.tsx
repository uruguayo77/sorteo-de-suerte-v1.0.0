import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InstantTicket } from '@/lib/supabase'
import { InstantTicketUtils, useScratchTicket } from '@/hooks/use-instant-tickets'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trophy, Gift, X, Sparkles } from 'lucide-react'

interface ScratchCardProps {
  ticket: InstantTicket
  className?: string
}

const ScratchCard: React.FC<ScratchCardProps> = ({ ticket, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Проверяем локальное хранилище для состояния билета
  const getInitialScratchedState = () => {
    const localState = localStorage.getItem(`ticket_${ticket.id}_scratched`)
    return ticket.is_scratched || (localState === 'true')
  }
  
  const [isScratched, setIsScratched] = useState(getInitialScratchedState)
  const [isDrawing, setIsDrawing] = useState(false)
  const [scratchPercentage, setScratchPercentage] = useState(0)
  const [showPrize, setShowPrize] = useState(getInitialScratchedState)
  const [dimensions, setDimensions] = useState({ width: 320, height: 200 })
  
  const scratchMutation = useScratchTicket()

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    if (isScratched) {
      localStorage.setItem(`ticket_${ticket.id}_scratched`, 'true')
      console.log('💾 Состояние билета сохранено в localStorage:', ticket.id)
      
      // Уведомляем о изменении для обновления статистики
      window.dispatchEvent(new CustomEvent('ticketStateChanged', {
        detail: { ticketId: ticket.id, isScratched: true }
      }))
    }
  }, [isScratched, ticket.id])

  // Обновление размеров canvas при изменении размера контейнера
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        // Используем точные размеры контейнера
        const newWidth = Math.max(rect.width || 320, 280) 
        const newHeight = 200 // Фиксированная высота как у контейнера
        
        console.log('📐 Обновляем размеры canvas:', {
          containerWidth: rect.width,
          containerHeight: rect.height,
          newWidth,
          newHeight
        })
        
        setDimensions({ width: newWidth, height: newHeight })
      }
    }

    // Небольшая задержка для инициализации после рендера
    const timer = setTimeout(updateDimensions, 100)

    // Обновляем размеры при изменении размера окна
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateDimensions, 50) // Небольшая задержка для стабильности
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [])



  // Инициализация состояния на основе данных билета и localStorage
  useEffect(() => {
    const localState = localStorage.getItem(`ticket_${ticket.id}_scratched`)
    const locallyScratched = localState === 'true'
    
    console.log('🎫 Билет инициализирован:', {
      ticketNumber: ticket.ticket_number,
      dbIsScratched: ticket.is_scratched,
      locallyScratched: locallyScratched,
      currentIsScratched: isScratched,
      currentShowPrize: showPrize,
      isWinner: ticket.is_winner,
      prizeAmount: ticket.prize_amount
    })
    
    // Билет считается стертым если стерт в БД ИЛИ локально
    const shouldShowResult = ticket.is_scratched || locallyScratched
    
    if (shouldShowResult) {
      console.log('🎫 Билет стерт (БД или локально), показываем результат НАВСЕГДА')
      setIsScratched(true)
      setShowPrize(true)
    } else {
      console.log('🎫 Билет НЕ стерт, показываем покрытие для стирания')
      setIsScratched(false)
      setShowPrize(false)
      setScratchPercentage(0)
    }
  }, [ticket.is_scratched, ticket.id])

  // Инициализация canvas - показываем покрытие для стирания только если билет НЕ стерт
  useEffect(() => {
    console.log('🎨 Canvas useEffect запущен:', {
      hasCanvas: !!canvasRef.current,
      isScratched,
      ticketNumber: ticket.ticket_number,
      dimensions
    })

    if (!canvasRef.current || isScratched) {
      console.log('🎨 Canvas useEffect пропущен - нет canvas или билет стерт')
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('🎨 Canvas useEffect пропущен - нет контекста')
      return
    }

    console.log('🎨 Начинаем отрисовку покрытия canvas с размерами:', dimensions)

    // Устанавливаем размеры canvas точно по контейнеру
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Очищаем весь canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Создаем плотное серое покрытие - сначала сплошной фон
    ctx.fillStyle = '#7C7C7C' // Основной серый цвет
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Добавляем блестящий градиент поверх
    const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height)
    gradient.addColorStop(0, 'rgba(139, 157, 195, 0.8)') // Полупрозрачный для смешивания
    gradient.addColorStop(0.25, 'rgba(221, 214, 254, 0.9)') 
    gradient.addColorStop(0.5, 'rgba(156, 163, 175, 0.7)')
    gradient.addColorStop(0.75, 'rgba(221, 214, 254, 0.9)')
    gradient.addColorStop(1, 'rgba(139, 157, 195, 0.8)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Добавляем блестящую текстуру
    ctx.globalCompositeOperation = 'overlay'
    for (let i = 0; i < 150; i++) {
      const alpha = Math.random() * 0.3
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      const size = Math.random() * 4 + 1
      ctx.fillRect(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height,
        size,
        size
      )
    }

    // Добавляем блестящие точки
    for (let i = 0; i < 50; i++) {
      const alpha = Math.random() * 0.6 + 0.2
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})` // Золотистый блеск
      const size = Math.random() * 2 + 1
      ctx.beginPath()
      ctx.arc(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height,
        size,
        0,
        2 * Math.PI
      )
      ctx.fill()
    }

    // Текст "СТИРАЙ ЗДЕСЬ"
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)'
    ctx.lineWidth = 1
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.strokeText('RASPA AQUÍ', dimensions.width / 2, dimensions.height / 2)
    ctx.fillText('RASPA AQUÍ', dimensions.width / 2, dimensions.height / 2)
    ctx.font = '12px Arial'
    ctx.strokeText('para ver tu premio', dimensions.width / 2, dimensions.height / 2 + 20)
    ctx.fillText('para ver tu premio', dimensions.width / 2, dimensions.height / 2 + 20)

    // Сброс композиции для стирания
    ctx.globalCompositeOperation = 'source-over'
    
    console.log('🎨 Canvas покрытие отрисовано успешно!')
  }, [dimensions.width, dimensions.height, isScratched, ticket.is_scratched])

  // Функция стирания
  const scratch = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current || ticket.is_scratched || isScratched) return // Защита от стирания уже стертых билетов

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    // Стираем круговую область с более естественным эффектом
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 20, 0, 2 * Math.PI) // Увеличили радиус для лучшего стирания
    ctx.fill()

    // Проверяем процент стирания
    checkScratchPercentage()
  }, [isScratched, ticket.is_scratched])

  // Проверка процента стирания
  const checkScratchPercentage = useCallback(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixelData = imageData.data

    let transparentPixels = 0
    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] === 0) {
        transparentPixels++
      }
    }

    const percentage = (transparentPixels / (canvas.width * canvas.height)) * 100
    setScratchPercentage(percentage)

    // Если стерто больше 60%, считаем билет стертым
    if (percentage > 60 && !isScratched) {
      handleTicketScratched()
    }
  }, [isScratched])

  // Обработка полного стирания билета
  const handleTicketScratched = async () => {
    // Защита от повторного стирания
    if (ticket.is_scratched || isScratched) {
      console.log('🚫 Билет уже стерт, игнорируем повторное стирание')
      return
    }
    
    console.log('🎫 Билет полностью стерт, начинаем обработку:', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      isWinner: ticket.is_winner,
      prizeAmount: ticket.prize_amount
    })
    
    // Устанавливаем локальное состояние НАВСЕГДА
    setIsScratched(true)
    setShowPrize(true)
    
    // Показываем уведомление сразу
    if (ticket.is_winner) {
      toast.success('¡Felicidades! ¡Has ganado!', {
        description: `Ganaste ${InstantTicketUtils.formatPrizeAmount(ticket.prize_amount)}. Tu premio se agregó al balance total.`,
        duration: 6000,
      })
    } else {
      toast.info('Sin premio esta vez', {
        description: '¡Sigue participando para más oportunidades de ganar!',
        duration: 4000,
      })
    }
    
    // Отправляем в базу данных в фоне
    try {
      console.log('🔄 Отправляем в БД билет:', ticket.id)
      const result = await scratchMutation.mutateAsync(ticket.id)
      console.log('✅ Результат обновления БД:', result)
    } catch (error) {
      console.error('❌ Error scratching ticket:', error)
      console.error('❌ Подробности ошибки:', {
        message: error.message,
        stack: error.stack,
        ticketId: ticket.id
      })
      
      toast.error('Error al sincronizar', {
        description: 'El billete está abierto, pero hubo un problema de sincronización'
      })
    }
  }

  // Обработчики мыши
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true)
    scratch(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return
    scratch(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  // Обработчики сенсорного экрана
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setIsDrawing(true)
    scratch(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const touch = e.touches[0]
    scratch(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(false)
  }

  // Реальный сканируемый штрих-код
  const renderBarcode = (barcode: string) => {
    return (
      <div className="flex flex-col items-center justify-center">
        <img 
          src="https://i.ibb.co/ds3zp4v2/Pngtree-barcode-clip-art-8062030.png"
          alt="Barcode"
          className="w-[768px] h-[96px] object-contain filter brightness-0 invert"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <div className="text-xs text-gray-400 mt-1">{barcode}</div>
      </div>
    )
  }

  // Отладочная информация
  console.log('🎫 Состояние рендера:', {
    ticketNumber: ticket.ticket_number,
    localIsScratched: isScratched,
    localShowPrize: showPrize,
    dbIsScratched: ticket.is_scratched,
    willShowResultOLD: isScratched && showPrize,
    willShowResultNEW: ticket.is_scratched || (isScratched && showPrize)
  })

  // Показываем результат если билет стерт в БД ИЛИ стерт локально
  if (ticket.is_scratched || (isScratched && showPrize)) {
    return (
      <Card className={`relative p-6 bg-white/10 backdrop-blur-sm border-gray-700 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-sm text-gray-400 mb-2">#{ticket.ticket_number}</div>
          
          <AnimatePresence>
            {ticket.is_winner ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 text-2xl">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <span className="text-green-400 font-bold">¡GANASTE!</span>
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                </div>
                
                <div className="text-3xl font-bold text-white">
                  {InstantTicketUtils.formatPrizeAmount(ticket.prize_amount)}
                </div>
                
                <div className="text-sm text-gray-300">
                  {InstantTicketUtils.getPrizeTypeLabel(ticket.prize_type)}
                </div>

                {!ticket.is_claimed && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                    <p className="text-green-300 text-sm">
                      ¡Felicidades! Contacta con soporte para reclamar tu premio.
                    </p>
                  </div>
                )}

                {ticket.is_claimed && (
                  <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
                    <p className="text-purple-300 text-sm">
                      Premio entregado ✅
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 text-lg">
                  <X className="w-6 h-6 text-gray-400" />
                  <span className="text-gray-400">Sin premio esta vez</span>
                </div>
                
                <div className="text-sm text-gray-500">
                  ¡Sigue participando para más oportunidades!
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Штрих-код */}
          <div className="pt-4 border-t border-gray-600">
            {renderBarcode(ticket.barcode)}
            <div className="text-xs text-gray-400 mt-1">{ticket.barcode}</div>
          </div>
        </div>
      </Card>
    )
  }

  // Билет не стерт - показываем canvas для стирания
  return (
    <Card className={`relative p-6 bg-white/10 backdrop-blur-sm border-gray-700 ${className}`}>
      <div className="text-center space-y-4">
        <div className="text-sm text-gray-400 mb-2">#{ticket.ticket_number}</div>
        
        <div ref={containerRef} className="relative w-full min-h-[200px] h-[200px] rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600">
          {/* Фон с призом (скрыт под canvas) */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
            <div className="text-center text-white">
              {ticket.is_winner ? (
                <>
                  <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-400" />
                  <div className="text-2xl font-bold">
                    {InstantTicketUtils.formatPrizeAmount(ticket.prize_amount)}
                  </div>
                  <div className="text-sm opacity-80">
                    {InstantTicketUtils.getPrizeTypeLabel(ticket.prize_type)}
                  </div>
                </>
              ) : (
                <>
                  <Gift className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <div className="text-lg">Sin premio</div>
                  <div className="text-sm opacity-60">¡Sigue intentando!</div>
                </>
              )}
            </div>
          </div>

          {/* Canvas для стирания */}
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0 cursor-pointer rounded-lg touch-none w-full h-full"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 10
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* Индикатор прогресса */}
        {scratchPercentage > 10 && scratchPercentage < 60 && (
          <div className="text-xs text-gray-400">
            Progreso: {Math.round(scratchPercentage)}%
          </div>
        )}

        {/* Штрих-код */}
        <div className="pt-4 border-t border-gray-600">
          {renderBarcode(ticket.barcode)}
          <div className="text-xs text-gray-400 mt-1">{ticket.barcode}</div>
        </div>

        {/* Инструкция */}
        <div className="text-xs text-gray-500">
          Usa el dedo o ratón para raspar la superficie brillante
        </div>
      </div>
    </Card>
  )
}

export default ScratchCard