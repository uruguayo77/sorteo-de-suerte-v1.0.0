/**
 * AnalyticsService - Сервис для работы с аналитическими данными
 * Обеспечивает получение метрик активности пользователей и бронирований
 */

import { supabase } from './supabase'

// Типы для аналитических данных
export interface UserActivityLog {
  id: string
  session_id: string
  user_ip?: string
  user_agent?: string
  page_visited: string
  action_type: 'page_visit' | 'number_select' | 'payment_start' | 'payment_complete' | 'ticket_scratch' | 'admin_login' | 'reservation_create' | 'reservation_cancel'
  metadata: Record<string, any>
  created_at: string
}

export interface ActiveUser {
  session_id: string
  user_ip?: string
  user_agent?: string
  page_views: number
  last_activity: string
  time_since_activity: string
  pages_visited: string[]
  actions_performed: string[]
}

export interface ActiveReservation {
  id: string
  user_name: string
  user_phone: string
  cedula: string
  numbers: number[]
  reservation_started_at?: string
  reservation_expires_at?: string
  draw_name?: string
  draw_date?: string
  query_time: string
  time_remaining?: string
  reservation_status: 'no_timer' | 'expired' | 'expiring_soon' | 'expiring_warning' | 'active'
  seconds_remaining?: number
}

export interface ConversionStats {
  date: string
  reservations_created: number
  reservations_paid: number
  reservations_expired: number
  conversion_rate_percent: number
  overall_success_rate: number
}

export interface HourlyActivity {
  date: string
  hour: number
  total_actions: number
  unique_users: number
  page_visits: number
  number_selections: number
  payment_starts: number
  payment_completions: number
}

export interface RealtimeAnalytics {
  users_online: number
  active_reservations: number
  expiring_reservations: number
  todays_conversion_rate: number
  hourly_activity: number
  last_updated: string
}

export class AnalyticsService {
  /**
   * Логирование активности пользователя
   */
  static async logUserActivity(data: {
    session_id: string
    page_visited: string
    action_type: UserActivityLog['action_type']
    user_ip?: string
    user_agent?: string
    metadata?: Record<string, any>
  }): Promise<boolean> {
    try {
      console.log('📊 Логирование активности:', data.action_type, 'на странице:', data.page_visited)
      
      const { error } = await supabase
        .from('user_activity_log')
        .insert({
          session_id: data.session_id,
          page_visited: data.page_visited,
          action_type: data.action_type,
          user_ip: data.user_ip,
          user_agent: data.user_agent || navigator.userAgent,
          metadata: data.metadata || {}
        })

      if (error) {
        console.error('❌ Ошибка логирования активности:', error)
        return false
      }

      console.log('✅ Активность успешно залогирована')
      return true
    } catch (error) {
      console.error('❌ Исключение при логировании активности:', error)
      return false
    }
  }

  /**
   * Получение активных пользователей (последние 10 минут)
   */
  static async getActiveUsers(): Promise<ActiveUser[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_active_users_public')

      if (error) {
        console.error('❌ Ошибка получения активных пользователей:', error)
        throw error
      }

      console.log('✅ Загружено активных пользователей:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Исключение при получении активных пользователей:', error)
      return []
    }
  }

  /**
   * Получение активных бронирований с countdown
   */
  static async getActiveReservations(): Promise<ActiveReservation[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_active_reservations_public')

      if (error) {
        console.error('❌ Ошибка получения активных бронирований:', error)
        throw error
      }

      console.log('✅ Загружено активных бронирований:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Исключение при получении активных бронирований:', error)
      return []
    }
  }

  /**
   * Получение статистики конверсии
   */
  static async getConversionStats(): Promise<ConversionStats[]> {
    try {
      const { data, error } = await supabase
        .from('v_conversion_stats')
        .select('*')
        .limit(30) // последние 30 дней

      if (error) {
        console.error('❌ Ошибка получения статистики конверсии:', error)
        throw error
      }

      console.log('✅ Загружена статистика конверсии:', data?.length || 0, 'дней')
      return data || []
    } catch (error) {
      console.error('❌ Исключение при получении статистики конверсии:', error)
      return []
    }
  }

  /**
   * Получение почасовой активности
   */
  static async getHourlyActivity(): Promise<HourlyActivity[]> {
    try {
      const { data, error } = await supabase
        .from('v_hourly_activity')
        .select('*')
        .limit(168) // 7 дней * 24 часа

      if (error) {
        console.error('❌ Ошибка получения почасовой активности:', error)
        throw error
      }

      console.log('✅ Загружена почасовая активность:', data?.length || 0, 'записей')
      return data || []
    } catch (error) {
      console.error('❌ Исключение при получении почасовой активности:', error)
      return []
    }
  }

  /**
   * Получение всех метрик в реальном времени (через функцию БД)
   */
  static async getRealtimeAnalytics(): Promise<RealtimeAnalytics | null> {
    try {
      console.log('📊 Запрос real-time аналитики...')

      const { data, error } = await supabase
        .rpc('get_realtime_analytics')

      if (error) {
        console.error('❌ Ошибка получения real-time аналитики:', error)
        throw error
      }

      console.log('✅ Real-time аналитика получена:', data)
      return data as RealtimeAnalytics
    } catch (error) {
      console.error('❌ Исключение при получении real-time аналитики:', error)
      return null
    }
  }

  /**
   * Получение логов активности с фильтрами
   */
  static async getActivityLogs(filters?: {
    action_type?: string
    page_visited?: string
    session_id?: string
    date_from?: string
    date_to?: string
    limit?: number
  }): Promise<UserActivityLog[]> {
    try {
      let query = supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })

      // Применяем фильтры
      if (filters?.action_type) {
        query = query.eq('action_type', filters.action_type)
      }
      if (filters?.page_visited) {
        query = query.eq('page_visited', filters.page_visited)
      }
      if (filters?.session_id) {
        query = query.eq('session_id', filters.session_id)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      } else {
        query = query.limit(1000) // лимит по умолчанию
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Ошибка получения логов активности:', error)
        throw error
      }

      console.log('✅ Загружено логов активности:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Исключение при получении логов активности:', error)
      return []
    }
  }

  /**
   * Очистка старых логов (вызывает функцию БД)
   */
  static async cleanupOldLogs(): Promise<number> {
    try {
      console.log('🧹 Запуск очистки старых логов...')

      const { data, error } = await supabase
        .rpc('cleanup_old_activity_logs')

      if (error) {
        console.error('❌ Ошибка очистки логов:', error)
        throw error
      }

      const deletedCount = data as number
      console.log('✅ Очистка завершена. Удалено записей:', deletedCount)
      return deletedCount
    } catch (error) {
      console.error('❌ Исключение при очистке логов:', error)
      return 0
    }
  }

  /**
   * Генерация уникального ID сессии для пользователя
   */
  static generateSessionId(): string {
    // Проверяем, есть ли уже сохраненный session_id
    const existingSessionId = localStorage.getItem('analytics_session_id')
    if (existingSessionId) {
      return existingSessionId
    }

    // Создаем новый session_id
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('analytics_session_id', sessionId)
    
    console.log('🆔 Новая сессия создана:', sessionId)
    return sessionId
  }

  /**
   * Получение IP адреса пользователя (упрощенный вариант)
   */
  static async getUserIP(): Promise<string | null> {
    try {
      // Для демо используем заглушку, в продакшене можно интегрировать сервис определения IP
      return '127.0.0.1'
    } catch (error) {
      console.error('❌ Ошибка получения IP:', error)
      return null
    }
  }

  /**
   * Массовое логирование (batch) для оптимизации производительности
   */
  static async logBatchActivity(activities: Array<{
    session_id: string
    page_visited: string
    action_type: UserActivityLog['action_type']
    user_ip?: string
    user_agent?: string
    metadata?: Record<string, any>
  }>): Promise<boolean> {
    try {
      if (activities.length === 0) return true

      console.log('📊 Batch логирование:', activities.length, 'активностей')

      const { error } = await supabase
        .from('user_activity_log')
        .insert(activities.map(activity => ({
          session_id: activity.session_id,
          page_visited: activity.page_visited,
          action_type: activity.action_type,
          user_ip: activity.user_ip,
          user_agent: activity.user_agent || navigator.userAgent,
          metadata: activity.metadata || {}
        })))

      if (error) {
        console.error('❌ Ошибка batch логирования:', error)
        return false
      }

      console.log('✅ Batch логирование успешно завершено')
      return true
    } catch (error) {
      console.error('❌ Исключение при batch логировании:', error)
      return false
    }
  }
}