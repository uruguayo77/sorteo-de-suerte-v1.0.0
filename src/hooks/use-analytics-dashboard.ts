/**
 * use-analytics-dashboard.ts - React хуки для аналитического дашборда
 * Обеспечивает real-time обновление метрик каждые 30 секунд с обработкой ошибок
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { AnalyticsService, type RealtimeAnalytics, type ActiveUser, type ActiveReservation, type ConversionStats, type HourlyActivity } from '@/lib/analyticsService'
import { toast } from '@/hooks/use-toast'

// Настройки для автообновления
const REFETCH_INTERVAL = 30000 // 30 секунд
const STALE_TIME = 25000 // 25 секунд
const ERROR_RETRY_DELAY = 10000 // 10 секунд при ошибке

/**
 * Хук для получения real-time метрик дашборда
 */
export function useRealtimeAnalytics() {
  const errorCountRef = useRef(0)
  const maxRetries = 3

  return useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: async () => {
      try {
        console.log('📊 Загрузка real-time аналитики...')
        const data = await AnalyticsService.getRealtimeAnalytics()
        
        // Сбрасываем счетчик ошибок при успешном запросе
        errorCountRef.current = 0
        
        if (!data) {
          throw new Error('Не удалось получить данные аналитики')
        }
        
        console.log('✅ Real-time аналитика загружена:', data)
        return data
      } catch (error) {
        errorCountRef.current++
        console.error('❌ Ошибка загрузки real-time аналитики:', error)
        
        // Показываем toast только при повторных ошибках
        if (errorCountRef.current >= 2) {
          toast({
            title: "Error de conexión",
            description: "No se pudo cargar la analítica en tiempo real",
            variant: "destructive"
          })
        }
        
        throw error
      }
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    retry: (failureCount, error) => {
      // Ограничиваем количество повторных попыток
      if (failureCount >= maxRetries) {
        console.warn('⚠️ Достигнуто максимальное количество повторных попыток для real-time аналитики')
        return false
      }
      return true
    },
    retryDelay: ERROR_RETRY_DELAY,
    // Продолжаем refetch даже при ошибках, но с большим интервалом
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  })
}

/**
 * Хук для получения списка активных пользователей
 */
export function useActiveUsers() {
  return useQuery({
    queryKey: ['analytics', 'active-users'],
    queryFn: async () => {
      console.log('👥 Загрузка активных пользователей...')
      const data = await AnalyticsService.getActiveUsers()
      console.log('✅ Активные пользователи загружены:', data.length)
      return data
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    retry: 2,
    retryDelay: ERROR_RETRY_DELAY
  })
}

/**
 * Хук для получения активных бронирований с countdown
 */
export function useActiveReservations() {
  return useQuery({
    queryKey: ['analytics', 'active-reservations'],
    queryFn: async () => {
      console.log('⏰ Загрузка активных бронирований...')
      const data = await AnalyticsService.getActiveReservations()
      console.log('✅ Активные бронирования загружены:', data.length)
      return data
    },
    refetchInterval: REFETCH_INTERVAL, // Более частое обновление для countdown
    staleTime: STALE_TIME,
    retry: 2,
    retryDelay: ERROR_RETRY_DELAY
  })
}

/**
 * Хук для получения статистики конверсии
 */
export function useConversionStats() {
  return useQuery({
    queryKey: ['analytics', 'conversion-stats'],
    queryFn: async () => {
      console.log('📈 Загрузка статистики конверсии...')
      const data = await AnalyticsService.getConversionStats()
      console.log('✅ Статистика конверсии загружена:', data.length, 'записей')
      return data
    },
    refetchInterval: REFETCH_INTERVAL * 2, // Менее частое обновление для исторических данных
    staleTime: STALE_TIME * 2,
    retry: 2,
    retryDelay: ERROR_RETRY_DELAY
  })
}

/**
 * Хук для получения почасовой активности
 */
export function useHourlyActivity() {
  return useQuery({
    queryKey: ['analytics', 'hourly-activity'],
    queryFn: async () => {
      console.log('📊 Загрузка почасовой активности...')
      const data = await AnalyticsService.getHourlyActivity()
      console.log('✅ Почасовая активность загружена:', data.length, 'записей')
      return data
    },
    refetchInterval: REFETCH_INTERVAL * 2,
    staleTime: STALE_TIME * 2,
    retry: 2,
    retryDelay: ERROR_RETRY_DELAY
  })
}

/**
 * Хук для получения логов активности с фильтрами
 */
export function useActivityLogs(filters?: {
  action_type?: string
  page_visited?: string
  session_id?: string
  date_from?: string
  date_to?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ['analytics', 'activity-logs', filters],
    queryFn: async () => {
      console.log('📝 Загрузка логов активности с фильтрами:', filters)
      const data = await AnalyticsService.getActivityLogs(filters)
      console.log('✅ Логи активности загружены:', data.length, 'записей')
      return data
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    retry: 2,
    retryDelay: ERROR_RETRY_DELAY,
    enabled: true // Всегда включен, но можно управлять через параметр
  })
}

/**
 * Кастомный хук для управления всем дашбордом аналитики
 */
export function useAnalyticsDashboard() {
  const queryClient = useQueryClient()
  
  // Все основные запросы
  const realtimeQuery = useRealtimeAnalytics()
  const activeUsersQuery = useActiveUsers()
  const activeReservationsQuery = useActiveReservations()
  const conversionStatsQuery = useConversionStats()
  const hourlyActivityQuery = useHourlyActivity()

  // Метод для принудительного обновления всех данных
  const refreshAll = useCallback(async () => {
    console.log('🔄 Принудительное обновление всей аналитики...')
    
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.refetchQueries({ queryKey: ['analytics'] })
      ])
      
      toast({
        title: "Datos actualizados",
        description: "La analítica se ha actualizado correctamente",
      })
    } catch (error) {
      console.error('❌ Ошибка обновления аналитики:', error)
      toast({
        title: "Error de actualización",
        description: "No se pudo actualizar la analítica",
        variant: "destructive"
      })
    }
  }, [queryClient])

  // Метод для очистки кэша
  const clearCache = useCallback(() => {
    console.log('🗑️ Очистка кэша аналитики...')
    queryClient.removeQueries({ queryKey: ['analytics'] })
    toast({
      title: "Caché limpiado",
      description: "Los datos de analítica se recargarán",
    })
  }, [queryClient])

  // Автоматическое обновление при возвращении фокуса на вкладку
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Вкладка получила фокус, обновляем аналитику...')
        queryClient.invalidateQueries({ queryKey: ['analytics', 'realtime'] })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [queryClient])

  // Подсчет общего состояния загрузки
  const isLoading = realtimeQuery.isLoading || activeUsersQuery.isLoading || activeReservationsQuery.isLoading
  const isError = realtimeQuery.isError || activeUsersQuery.isError || activeReservationsQuery.isError
  const hasData = realtimeQuery.data || activeUsersQuery.data || activeReservationsQuery.data

  // Агрегированные данные для удобства
  const dashboardData = {
    realtime: realtimeQuery.data,
    activeUsers: activeUsersQuery.data || [],
    activeReservations: activeReservationsQuery.data || [],
    conversionStats: conversionStatsQuery.data || [],
    hourlyActivity: hourlyActivityQuery.data || []
  }

  // Статистики для быстрого доступа
  const stats = {
    usersOnline: realtimeQuery.data?.users_online || 0,
    activeReservations: realtimeQuery.data?.active_reservations || 0,
    expiringReservations: realtimeQuery.data?.expiring_reservations || 0,
    conversionRate: realtimeQuery.data?.todays_conversion_rate || 0,
    hourlyActivity: realtimeQuery.data?.hourly_activity || 0,
    lastUpdated: realtimeQuery.data?.last_updated
  }

  return {
    // Данные
    data: dashboardData,
    stats,
    
    // Состояние загрузки
    isLoading,
    isError,
    hasData,
    
    // Отдельные запросы для детального контроля
    queries: {
      realtime: realtimeQuery,
      activeUsers: activeUsersQuery,
      activeReservations: activeReservationsQuery,
      conversionStats: conversionStatsQuery,
      hourlyActivity: hourlyActivityQuery
    },
    
    // Методы управления
    refreshAll,
    clearCache,
    
    // Вспомогательные данные
    lastRefresh: new Date().toLocaleTimeString()
  }
}

/**
 * Хук для уведомлений о критических событиях
 */
export function useAnalyticsAlerts() {
  const { data: activeReservations } = useActiveReservations()
  const { stats } = useAnalyticsDashboard()
  const alertShownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!activeReservations || activeReservations.length === 0) return

    // Проверяем критически истекающие бронирования
    const criticalReservations = activeReservations.filter(
      reservation => reservation.reservation_status === 'expiring_soon'
    )

    criticalReservations.forEach(reservation => {
      const alertKey = `expiring_${reservation.id}`
      
      // Показываем уведомление только один раз для каждого бронирования
      if (!alertShownRef.current.has(alertKey)) {
        alertShownRef.current.add(alertKey)
        
        toast({
          title: "⚠️ Reserva expirando",
          description: `La reserva de ${reservation.user_name} expira en menos de 5 minutos`,
          variant: "destructive",
          duration: 10000 // 10 секунд
        })
      }
    })

    // Очищаем старые уведомления для завершенных бронирований
    const activeIds = new Set(activeReservations.map(r => `expiring_${r.id}`))
    alertShownRef.current.forEach(alertKey => {
      if (alertKey.startsWith('expiring_') && !activeIds.has(alertKey)) {
        alertShownRef.current.delete(alertKey)
      }
    })
  }, [activeReservations])

  // Уведомления о высокой активности
  useEffect(() => {
    if (stats.usersOnline > 50) { // Порог для "высокой" активности
      const alertKey = 'high_activity'
      
      if (!alertShownRef.current.has(alertKey)) {
        alertShownRef.current.add(alertKey)
        
        toast({
          title: "📈 Alta actividad detectada",
          description: `${stats.usersOnline} usuarios en línea`,
          duration: 5000
        })
        
        // Удаляем уведомление через некоторое время
        setTimeout(() => {
          alertShownRef.current.delete(alertKey)
        }, 300000) // 5 минут
      }
    }
  }, [stats.usersOnline])

  return {
    alertsCount: alertShownRef.current.size
  }
}