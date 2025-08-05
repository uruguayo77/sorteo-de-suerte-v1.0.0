/**
 * useActivityTracker - Хук для автоматического отслеживания активности пользователей
 * Логирует посещения страниц, действия и другую активность без влияния на производительность
 */

import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { AnalyticsService } from '@/lib/analyticsService'

interface ActivityTrackerOptions {
  enabled?: boolean
  batchSize?: number
  flushInterval?: number // в миллисекундах
  trackPageViews?: boolean
  trackUserInteractions?: boolean
}

const defaultOptions: ActivityTrackerOptions = {
  enabled: true,
  batchSize: 10,
  flushInterval: 30000, // 30 секунд
  trackPageViews: true,
  trackUserInteractions: true
}

// Очередь для batch логирования
let activityQueue: Array<{
  session_id: string
  page_visited: string
  action_type: any
  user_ip?: string
  user_agent?: string
  metadata?: Record<string, any>
}> = []

// Таймер для периодической отправки
let flushTimer: NodeJS.Timeout | null = null

export function useActivityTracker(options: ActivityTrackerOptions = {}) {
  const config = { ...defaultOptions, ...options }
  const location = useLocation()
  const sessionId = useRef<string>('')
  const userIP = useRef<string | null>(null)
  const lastPageVisit = useRef<string>('')
  const isInitialized = useRef(false)

  // Инициализация сессии
  useEffect(() => {
    if (!config.enabled || isInitialized.current) return

    const initializeSession = async () => {
      try {
        // Генерируем или получаем существующий session ID
        sessionId.current = AnalyticsService.generateSessionId()
        
        // Получаем IP адрес пользователя
        userIP.current = await AnalyticsService.getUserIP()
        
        isInitialized.current = true
        
        console.log('🔍 Activity Tracker инициализирован:', {
          sessionId: sessionId.current,
          userIP: userIP.current
        })
      } catch (error) {
        console.error('❌ Ошибка инициализации Activity Tracker:', error)
      }
    }

    initializeSession()
  }, [config.enabled])

  // Функция для добавления активности в очередь
  const queueActivity = useCallback((
    action_type: any,
    page_visited: string,
    metadata?: Record<string, any>
  ) => {
    if (!config.enabled || !sessionId.current) return

    try {
      activityQueue.push({
        session_id: sessionId.current,
        page_visited,
        action_type,
        user_ip: userIP.current || undefined,
        user_agent: navigator.userAgent,
        metadata: metadata || {}
      })

      console.log('📊 Активность добавлена в очередь:', action_type, 'на', page_visited)

      // Если очередь достигла размера batch, отправляем немедленно
      if (activityQueue.length >= config.batchSize!) {
        flushActivityQueue()
      }
    } catch (error) {
      console.error('❌ Ошибка добавления активности в очередь:', error)
    }
  }, [config.enabled, config.batchSize])

  // Функция для отправки накопленной активности
  const flushActivityQueue = useCallback(async () => {
    if (activityQueue.length === 0) return

    try {
      const activitiesToSend = [...activityQueue]
      activityQueue = [] // Очищаем очередь

      console.log('🚀 Отправка batch активности:', activitiesToSend.length, 'записей')

      const success = await AnalyticsService.logBatchActivity(activitiesToSend)
      if (!success) {
        console.warn('⚠️ Не удалось отправить некоторые активности, возвращаем в очередь')
        // В случае ошибки возвращаем активности обратно в очередь
        activityQueue.unshift(...activitiesToSend)
      }
    } catch (error) {
      console.error('❌ Ошибка отправки batch активности:', error)
    }
  }, [])

  // Настройка периодической отправки
  useEffect(() => {
    if (!config.enabled) return

    // Очищаем предыдущий таймер
    if (flushTimer) {
      clearInterval(flushTimer)
    }

    // Устанавливаем новый таймер для периодической отправки
    flushTimer = setInterval(() => {
      flushActivityQueue()
    }, config.flushInterval!)

    // Очистка при размонтировании
    return () => {
      if (flushTimer) {
        clearInterval(flushTimer)
        flushTimer = null
      }
      // Отправляем оставшиеся активности при выходе
      flushActivityQueue()
    }
  }, [config.enabled, config.flushInterval, flushActivityQueue])

  // Отслеживание посещений страниц
  useEffect(() => {
    if (!config.enabled || !config.trackPageViews || !isInitialized.current) return

    const currentPage = location.pathname + location.search
    
    // Избегаем дублирования логов для той же страницы
    if (lastPageVisit.current === currentPage) return
    
    lastPageVisit.current = currentPage

    console.log('📄 Посещение страницы:', currentPage)

    queueActivity(
      'page_visit',
      currentPage,
      {
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    )
  }, [location.pathname, location.search, config.enabled, config.trackPageViews, queueActivity])

  // Отслеживание взаимодействий пользователя
  useEffect(() => {
    if (!config.enabled || !config.trackUserInteractions) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        queueActivity(
          'page_visit',
          location.pathname + location.search,
          {
            action: 'tab_focus',
            timestamp: new Date().toISOString()
          }
        )
      }
    }

    const handleBeforeUnload = () => {
      // Синхронная отправка перед закрытием страницы
      if (activityQueue.length > 0) {
        navigator.sendBeacon('/api/analytics', JSON.stringify(activityQueue))
      }
    }

    // Слушатели событий
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [config.enabled, config.trackUserInteractions, location.pathname, location.search, queueActivity])

  // Публичные методы для ручного логирования
  const trackAction = useCallback((
    action_type: any,
    metadata?: Record<string, any>
  ) => {
    const currentPage = location.pathname + location.search
    queueActivity(action_type, currentPage, metadata)
  }, [location.pathname, location.search, queueActivity])

  const trackNumberSelection = useCallback((numbers: number[]) => {
    trackAction('number_select', {
      selected_numbers: numbers,
      count: numbers.length,
      timestamp: new Date().toISOString()
    })
  }, [trackAction])

  const trackPaymentStart = useCallback((amount: number, method: string) => {
    trackAction('payment_start', {
      amount,
      payment_method: method,
      timestamp: new Date().toISOString()
    })
  }, [trackAction])

  const trackPaymentComplete = useCallback((amount: number, method: string, transactionId?: string) => {
    trackAction('payment_complete', {
      amount,
      payment_method: method,
      transaction_id: transactionId,
      timestamp: new Date().toISOString()
    })
  }, [trackAction])

  const trackTicketScratch = useCallback((ticketId: string) => {
    trackAction('ticket_scratch', {
      ticket_id: ticketId,
      timestamp: new Date().toISOString()
    })
  }, [trackAction])

  const trackAdminLogin = useCallback((adminEmail?: string) => {
    trackAction('admin_login', {
      admin_email: adminEmail,
      timestamp: new Date().toISOString()
    })
  }, [trackAction])

  const trackReservationCreate = useCallback((applicationId: string, numbers: number[]) => {
    trackAction('reservation_create', {
      application_id: applicationId,
      numbers,
      count: numbers.length,
      timestamp: new Date().toISOString()
    })
  }, [trackAction])

  const trackReservationCancel = useCallback((applicationId: string, reason?: string) => {
    trackAction('reservation_cancel', {
      application_id: applicationId,
      reason,
      timestamp: new Date().toISOString()
    })
  }, [trackAction])

  // Метод для принудительной отправки очереди
  const flushNow = useCallback(() => {
    flushActivityQueue()
  }, [flushActivityQueue])

  return {
    // Состояние
    isEnabled: config.enabled,
    sessionId: sessionId.current,
    queueSize: activityQueue.length,
    
    // Методы отслеживания
    trackAction,
    trackNumberSelection,
    trackPaymentStart,
    trackPaymentComplete,
    trackTicketScratch,
    trackAdminLogin,
    trackReservationCreate,
    trackReservationCancel,
    
    // Управление
    flushNow
  }
}