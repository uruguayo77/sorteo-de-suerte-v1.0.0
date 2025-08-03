import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SupabaseService } from '@/lib/supabaseService'
import { InstantTicket } from '@/lib/supabase'
import { toast } from 'sonner'

// Хук для получения билетов по ID заявки
export function useInstantTickets(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['instant-tickets', applicationId],
    queryFn: () => 
      applicationId 
        ? SupabaseService.getInstantTicketsByApplication(applicationId)
        : Promise.resolve([]),
    enabled: !!applicationId,
    staleTime: 1000, // Уменьшили до 1 секунды для быстрого обновления
    refetchOnWindowFocus: true, // Обновляем при фокусе окна
    refetchInterval: 5000 // Автообновление каждые 5 секунд
  })
}

// Хук для стирания билета
export function useScratchTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const success = await SupabaseService.scratchTicket(ticketId)
      if (!success) {
        throw new Error('No se pudo raspar el billete')
      }
      return success
    },
    onMutate: async (ticketId) => {
      console.log('🔄 Начинаем оптимистичное обновление для:', ticketId)
      
      // Отменяем текущие запросы для предотвращения конфликтов
      await queryClient.cancelQueries({ queryKey: ['instant-tickets'] })
      
      // Получаем текущие данные
      const previousTickets = queryClient.getQueriesData({ queryKey: ['instant-tickets'] })
      
      // Оптимистично обновляем кэш - ТОЛЬКО если билет еще не стерт
      queryClient.setQueriesData({ queryKey: ['instant-tickets'] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData
        
        return oldData.map((ticket: InstantTicket) => 
          ticket.id === ticketId && !ticket.is_scratched // Только если еще не стерт
            ? { ...ticket, is_scratched: true, updated_at: new Date().toISOString() }
            : ticket
        )
      })
      
      console.log('🔄 Оптимистичное обновление выполнено для билета:', ticketId)
      
      return { previousTickets }
    },
    onSuccess: (_, ticketId) => {
      console.log('✅ Билет успешно стерт в БД:', ticketId)
      
      // Очищаем localStorage так как теперь синхронизировано с БД
      localStorage.removeItem(`ticket_${ticketId}_scratched`)
      console.log('🧹 localStorage очищен для билета:', ticketId)
      
      // Обновляем все связанные кэши для полной синхронизации
      queryClient.invalidateQueries({ queryKey: ['instant-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['instant-tickets-admin'] })
      queryClient.invalidateQueries({ queryKey: ['instant-tickets-stats'] })
      
      // Принудительное обновление для моментального отображения
      queryClient.refetchQueries({ queryKey: ['instant-tickets'] })
      queryClient.refetchQueries({ queryKey: ['instant-tickets-admin'] })
      queryClient.refetchQueries({ queryKey: ['instant-tickets-stats'] })
      
      console.log('✨ Все кэши обновлены и баланс должен синхронизироваться')
    },
    onError: (error, ticketId, context) => {
      console.error('❌ Ошибка при стирании билета:', error)
      
      // Откатываем оптимистичные изменения при ошибке
      if (context?.previousTickets) {
        context.previousTickets.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      toast.error('Error al raspar billete', {
        description: 'Inténtalo de nuevo'
      })
    }
  })
}

// Хук для получения приза
export function useClaimPrize() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId: string) => {
      console.log('🔄 Вызов мутации claimPrize для билета:', ticketId)
      const success = await SupabaseService.claimPrize(ticketId)
      if (!success) {
        throw new Error('No se pudo reclamar el premio')
      }
      console.log('✅ Мутация claimPrize успешна для билета:', ticketId)
      return success
    },
    onSuccess: (data, ticketId) => {
      console.log('🎉 onSuccess: Приз успешно выплачен для билета:', ticketId)
      
      // Обновляем кэш всех instant tickets
      queryClient.invalidateQueries({ queryKey: ['instant-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['instant-tickets-admin'] })
      queryClient.invalidateQueries({ queryKey: ['instant-tickets-stats'] })
      
      // Принудительно рефетчим
      queryClient.refetchQueries({ queryKey: ['instant-tickets-admin'] })
      queryClient.refetchQueries({ queryKey: ['instant-tickets-stats'] })
      
      toast.success('¡Premio reclamado!', {
        description: 'El premio ha sido marcado como entregado'
      })
      
      console.log('✅ Кэш обновлен после выплаты приза')
    },
    onError: (error, ticketId) => {
      console.error('❌ onError: Error al reclamar premio:', error, 'para billete:', ticketId)
      toast.error('Error al reclamar premio', {
        description: 'Contacta con soporte'
      })
    }
  })
}

// Хук для админа - получение всех билетов с фильтрами
export function useInstantTicketsAdmin(filters?: {
  is_winner?: boolean
  is_scratched?: boolean  
  is_claimed?: boolean
  limit?: number
}) {
  return useQuery({
    queryKey: ['instant-tickets-admin', filters],
    queryFn: () => SupabaseService.getAllInstantTickets(filters),
    staleTime: 5000, // 5 секунд кэширования для быстрого обновления
    refetchOnWindowFocus: true, // Обновляем при фокусе окна
    refetchInterval: 10000 // Автообновление каждые 10 секунд
  })
}

// Хук для статистики билетов (для админа)
export function useInstantTicketsStats() {
  return useQuery({
    queryKey: ['instant-tickets-stats'],
    queryFn: () => SupabaseService.getInstantTicketsStats(),
    staleTime: 300000, // 5 минут кэширования для статистики
    refetchOnWindowFocus: false
  })
}

// Хук для группировки билетов по розыгрышам
export function useInstantTicketsGroupedByDraw() {
  return useQuery({
    queryKey: ['instant-tickets-grouped-by-draw'],
    queryFn: async () => {
      const tickets = await SupabaseService.getAllInstantTickets()
      
      // Группируем билеты по розыгрышам
      const grouped = tickets.reduce((acc, ticket) => {
        const drawKey = ticket.draw_id || 'no-draw'
        const drawName = ticket.draw_name || 'Sin sorteo asignado'
        
        if (!acc[drawKey]) {
          acc[drawKey] = {
            draw_id: ticket.draw_id,
            draw_name: drawName,
            draw_date: ticket.draw_date,
            draw_status: ticket.draw_status,
            draw_prize_description: ticket.draw_prize_description,
            draw_winner_number: ticket.draw_winner_number,
            draw_winner_name: ticket.draw_winner_name,
            tickets: []
          }
        }
        
        acc[drawKey].tickets.push(ticket)
        return acc
      }, {} as Record<string, {
        draw_id: string | null
        draw_name: string
        draw_date?: string
        draw_status?: string
        draw_prize_description?: string
        draw_winner_number?: number
        draw_winner_name?: string
        tickets: any[]
      }>)
      
      // Конвертируем в массив и сортируем по самой новой заявке в каждой группе
      return Object.values(grouped).sort((a, b) => {
        // Находим самую новую заявку в каждой группе
        const getLatestTicketDate = (tickets: any[]) => {
          return Math.max(...tickets.map(ticket => new Date(ticket.created_at).getTime()))
        }
        
        const latestDateA = getLatestTicketDate(a.tickets)
        const latestDateB = getLatestTicketDate(b.tickets)
        
        // Сортируем по убыванию (новые розыгрыши сверху)
        return latestDateB - latestDateA
      })
    },
    refetchInterval: 10000, // Обновляем каждые 10 секунд
    staleTime: 5000 // Данные считаются свежими 5 секунд
  })
}

// Утилиты для работы с билетами
export const InstantTicketUtils = {
  // Форматирование суммы приза
  formatPrizeAmount: (amount: number): string => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  },

  // Получение описания типа приза
  getPrizeTypeLabel: (prizeType: InstantTicket['prize_type']): string => {
    const labels = {
      'none': 'Sin premio',
      'small': 'Premio pequeño',
      'medium': 'Premio mediano', 
      'large': 'Premio grande'
    }
    return labels[prizeType] || 'Desconocido'
  },

  // Получение цвета для типа приза
  getPrizeTypeColor: (prizeType: InstantTicket['prize_type']): string => {
    const colors = {
      'none': 'text-gray-400',
      'small': 'text-green-400',
      'medium': 'text-yellow-400',
      'large': 'text-red-400'
    }
    return colors[prizeType] || 'text-gray-400'
  },

  // Проверка, можно ли стереть билет
  canScratch: (ticket: InstantTicket): boolean => {
    return !ticket.is_scratched
  },

  // Проверка, можно ли получить приз
  canClaim: (ticket: InstantTicket): boolean => {
    return ticket.is_winner && ticket.is_scratched && !ticket.is_claimed
  },

  // Получение статуса билета
  getTicketStatus: (ticket: InstantTicket): {
    status: 'unscratched' | 'no_prize' | 'winner_unclaimed' | 'winner_claimed'
    label: string
    color: string
  } => {
    if (!ticket.is_scratched) {
      return {
        status: 'unscratched',
        label: 'Por raspar',
        color: 'text-blue-400'
      }
    }
    
    if (!ticket.is_winner) {
      return {
        status: 'no_prize',
        label: 'Sin premio',
        color: 'text-gray-400'
      }
    }
    
    if (!ticket.is_claimed) {
      return {
        status: 'winner_unclaimed',
        label: '¡Ganador! - No reclamado',
        color: 'text-green-400'
      }
    }
    
    return {
      status: 'winner_claimed',
      label: 'Premio entregado',
      color: 'text-purple-400'
    }
  }
}