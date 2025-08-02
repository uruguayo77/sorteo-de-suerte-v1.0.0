import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { useInstantTickets } from '@/hooks/use-instant-tickets'
import ScratchCard from './ScratchCard'
import { Ticket, History, Gift, Trophy, AlertCircle } from 'lucide-react'
import { InstantTicketUtils } from '@/hooks/use-instant-tickets'

interface InstantTicketsSectionProps {
  applicationId: string | undefined
  applicationStatus: string
}

const InstantTicketsSection: React.FC<InstantTicketsSectionProps> = ({
  applicationId,
  applicationStatus
}) => {
  const { data: tickets, isLoading, error } = useInstantTickets(applicationId)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Принудительно обновляем компонент при изменении билетов
  useEffect(() => {
    console.log('🔄 Билеты изменились, пересчитываем статистику')
  }, [tickets])

  // Слушаем изменения localStorage для обновления статистики
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('💾 localStorage изменился, обновляем статистику')
      setForceUpdate(prev => prev + 1)
    }

    const handleTicketStateChange = (event: CustomEvent) => {
      console.log('🎫 Билет изменился:', event.detail)
      setForceUpdate(prev => prev + 1)
    }

    // Слушаем изменения в других вкладках
    window.addEventListener('storage', handleStorageChange)
    
    // Слушаем изменения состояния билетов
    window.addEventListener('ticketStateChanged', handleTicketStateChange as EventListener)
    
    // Периодически проверяем изменения (фоллбэк)
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1)
    }, 5000) // Увеличили до 5 секунд, так как есть прямые уведомления

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('ticketStateChanged', handleTicketStateChange as EventListener)
      clearInterval(interval)
    }
  }, [])

  // Показываем секцию только если заявка одобрена
  if (applicationStatus !== 'approved') {
    return null
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
          <div className="flex items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="text-white ml-3">Cargando billetes instantáneos...</span>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Состояние ошибки
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
          <div className="flex items-center justify-center text-red-400">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>Error al cargar los billetes</span>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Нет билетов
  if (!tickets || tickets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
          <div className="text-center space-y-4">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-semibold text-white">Billetes Instantáneos</h3>
            <p className="text-gray-400">
              Tus billetes instantáneos aparecerán aquí pronto
            </p>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Функция для проверки локального состояния билета
  const isTicketScratchedLocally = (ticketId: string) => {
    const localState = localStorage.getItem(`ticket_${ticketId}_scratched`)
    return localState === 'true'
  }

  // Функция проверки - билет стерт если стерт в БД ИЛИ локально
  const isTicketScratched = (ticket: any) => {
    return ticket.is_scratched || isTicketScratchedLocally(ticket.id)
  }

  // Статистика билетов (учитываем БД + localStorage)
  const ticketStats = {
    total: tickets.length,
    scratched: tickets.filter(t => isTicketScratched(t)).length,
    winners: tickets.filter(t => t.is_winner && isTicketScratched(t)).length,
    totalWinnings: tickets
      .filter(t => t.is_winner && isTicketScratched(t))
      .reduce((sum, t) => sum + parseFloat(t.prize_amount.toString()), 0)
  }

  // Debug логи для отслеживания статистики
  console.log('📊 Статистика InstantTicketsSection обновлена (forceUpdate:', forceUpdate, '):', {
    total: ticketStats.total,
    scratched: ticketStats.scratched,
    winners: ticketStats.winners,
    totalWinnings: ticketStats.totalWinnings,
    formattedWinnings: InstantTicketUtils.formatPrizeAmount(ticketStats.totalWinnings),
    ticketsData: tickets.map(t => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      isScratched: t.is_scratched,
      isWinner: t.is_winner,
      prizeAmount: t.prize_amount,
      locallyScratched: isTicketScratchedLocally(t.id),
      finallyScratched: isTicketScratched(t)
    }))
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-6"
    >
      {/* Заголовок секции */}
      <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Ticket className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Billetes Instantáneos</h2>
          </div>
          <div className="text-sm text-gray-400">
            {ticketStats.total} billete{ticketStats.total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white">{ticketStats.total}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-400">{ticketStats.scratched}</div>
            <div className="text-xs text-gray-400">Raspados</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-400">{ticketStats.winners}</div>
            <div className="text-xs text-gray-400">Ganadores</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-yellow-400">
              {InstantTicketUtils.formatPrizeAmount(ticketStats.totalWinnings)}
            </div>
            <div className="text-xs text-gray-400">Ganado</div>
          </div>
        </div>

        {/* Resumen de ganancias */}
        {ticketStats.winners > 0 && (
          <div className="mt-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
            <div className="flex items-center gap-2 text-green-300">
              <Trophy className="w-4 h-4" />
              <span className="text-sm">
                ¡Felicidades! Has ganado {InstantTicketUtils.formatPrizeAmount(ticketStats.totalWinnings)} en total
              </span>
            </div>
            {tickets.some(t => t.is_winner && t.is_scratched && !t.is_claimed) && (
              <p className="text-xs text-green-200 mt-1">
                Contacta con soporte para reclamar tus premios pendientes
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Billetes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket, index) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <ScratchCard ticket={ticket} />
          </motion.div>
        ))}
      </div>

      {/* Historia */}
      <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Historial de Apertura</h3>
        </div>

        <div className="space-y-3">
          {tickets
            .filter(ticket => ticket.is_scratched)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .map((ticket) => {
              const ticketStatus = InstantTicketUtils.getTicketStatus(ticket)
              return (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <div>
                      <div className="text-sm text-white">#{ticket.ticket_number}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(ticket.updated_at).toLocaleString('es-ES')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${ticketStatus.color}`}>
                      {ticketStatus.label}
                    </div>
                    {ticket.is_winner && (
                      <div className="text-xs text-yellow-400">
                        {InstantTicketUtils.formatPrizeAmount(ticket.prize_amount)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

          {tickets.filter(ticket => ticket.is_scratched).length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aún no has raspado ningún billete</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export default InstantTicketsSection