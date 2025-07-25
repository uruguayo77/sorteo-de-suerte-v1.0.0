import { useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// Хук для получения розыгрышей с активными таймерами
export function useScheduledDrawsWithTimer() {
  return useQuery({
    queryKey: ['scheduled-draws-with-timer'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_scheduled_draws_with_timer')
        
        if (error) {
          // Если функция не существует, возвращаем пустой массив
          if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
            console.warn('Функция get_scheduled_draws_with_timer не найдена. Выполните миграцию add_scheduled_start_time.sql')
            return []
          }
          throw error
        }
        return data as Array<{
          id: string
          draw_name: string
          scheduled_start_time: string
          seconds_remaining: number
          status: string
        }>
      } catch (error) {
        console.warn('Ошибка при получении отложенных розыгрышей:', error)
        return []
      }
    },
    enabled: false, // Отключаем хук по умолчанию (опциональная функция)
    refetchInterval: false, // Отключаем автоматическое обновление
    retry: false, // Не повторяем запрос при ошибке
  })
}

// Хук для автоматического запуска отложенных розыгрышей
export function useScheduledDrawAutostart() {
  const { data: scheduledDraws } = useScheduledDrawsWithTimer()

  const checkAndStartDraws = useCallback(async () => {
    // Не выполняем проверку, если функции отложенного запуска недоступны
    return
    
    try {
      const { data: updatedCount, error } = await supabase
        .rpc('auto_start_scheduled_draws')
      
      if (error) {
        // Если функция не существует, просто игнорируем
        if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
          // Функция не существует - миграция не выполнена
          return
        }
        throw error
      }
      
      if (updatedCount && updatedCount > 0) {
        toast.success(`${updatedCount} sorteo(s) iniciado(s) automáticamente`)
      }
    } catch (error) {
      console.warn('Ошибка при автозапуске розыгрышей:', error)
    }
  }, [])

  useEffect(() => {
    // Отключаем автозапуск полностью (опциональная функция)
    return
    
    // Проверяем каждые 30 секунд
    const interval = setInterval(checkAndStartDraws, 30000)
    
    // Также проверяем сразу при загрузке
    checkAndStartDraws()
    
    return () => clearInterval(interval)
  }, [checkAndStartDraws])

  return { scheduledDraws }
}

// Хук для отображения обратного отсчета
export function useDrawCountdown(scheduledStartTime?: string) {
  const { data: timeData } = useQuery({
    queryKey: ['draw-countdown', scheduledStartTime],
    queryFn: () => {
      if (!scheduledStartTime) return null
      
      const now = new Date()
      const startTime = new Date(scheduledStartTime)
      const diffMs = startTime.getTime() - now.getTime()
      
      if (diffMs <= 0) return null
      
      const totalSeconds = Math.floor(diffMs / 1000)
      const days = Math.floor(totalSeconds / (24 * 3600))
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      
      return { days, hours, minutes, seconds, totalSeconds }
    },
    refetchInterval: 1000,
    enabled: !!scheduledStartTime
  })

  return timeData
}

// Функция для форматирования времени обратного отсчета
export function formatCountdown(timeData: { days: number, hours: number, minutes: number, seconds: number } | null | undefined): string {
  if (!timeData || timeData.days < 0) return '00:00:00'
  
  if (timeData.days > 0) {
    return `${timeData.days}d ${timeData.hours.toString().padStart(2, '0')}:${timeData.minutes.toString().padStart(2, '0')}:${timeData.seconds.toString().padStart(2, '0')}`
  } else {
    return `${timeData.hours.toString().padStart(2, '0')}:${timeData.minutes.toString().padStart(2, '0')}:${timeData.seconds.toString().padStart(2, '0')}`
  }
} 