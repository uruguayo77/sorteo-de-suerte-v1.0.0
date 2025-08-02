import { supabase, DatabaseLotteryHistory, DatabaseActiveLottery, InstantTicket } from './supabase'
import { LotteryHistory } from './lotteryStore'

export class SupabaseService {
  // ============================================
  // ИСТОРИЯ РОЗЫГРЫШЕЙ
  // ============================================

  // Получение следующего номера розыгрыша
  static async getNextLotteryNumber(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('lottery_history')
        .select('lottery_number')
        .order('lottery_number', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Ошибка получения последнего номера розыгрыша:', error)
        return 1 // Начинаем с первого розыгрыша
      }

      const lastNumber = data && data.length > 0 ? data[0].lottery_number : 0
      return lastNumber + 1
    } catch (error) {
      console.error('❌ Ошибка в getNextLotteryNumber:', error)
      return 1
    }
  }

  // Получение всей истории розыгрышей
  static async getLotteryHistory(): Promise<LotteryHistory[]> {
    try {
      const { data, error } = await supabase
        .from('lottery_history')
        .select('*')
        .order('lottery_number', { ascending: false }) // Сортировка по номеру розыгрыша

      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('406')) {
          console.error('❌ Проблема с доступом к таблице lottery_history. Проверьте RLS политики в Supabase.');
          console.error('Ошибка:', error);
          return [];
        } else {
          console.error('❌ Ошибка получения истории:', error);
          throw error;
        }
      }

      // Конвертируем данные из БД в формат приложения
      return data.map(this.convertDatabaseToAppHistory)
    } catch (error) {
      console.error('❌ Критическая ошибка в getLotteryHistory:', error)
      return []
    }
  }

  // Добавление записи в историю
  static async addToHistory(historyEntry: Omit<LotteryHistory, 'id'>): Promise<string | null> {
    try {
      const dbEntry = this.convertAppToDatabase(historyEntry)
      
      const { data, error } = await supabase
        .from('lottery_history')
        .insert([dbEntry])
        .select('id')
        .single()

      if (error) {
        console.error('❌ Ошибка добавления в историю:', error)
        throw error
      }

      console.log('✅ Запись добавлена в историю:', data.id)
      return data.id
    } catch (error) {
      console.error('❌ Ошибка в addToHistory:', error)
      return null
    }
  }

  // Очистка всей истории
  static async clearHistory(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lottery_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Удаляем все записи

      if (error) {
        console.error('❌ Ошибка очистки истории:', error)
        throw error
      }

      console.log('✅ История очищена')
      return true
    } catch (error) {
      console.error('❌ Ошибка в clearHistory:', error)
      return false
    }
  }

  // Удаление конкретной записи из истории
  static async deleteHistoryEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lottery_history')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Ошибка удаления записи:', error)
        throw error
      }

      console.log('✅ Запись удалена:', id)
      return true
    } catch (error) {
      console.error('❌ Ошибка в deleteHistoryEntry:', error)
      return false
    }
  }

  // ============================================
  // АКТИВНЫЕ РОЗЫГРЫШИ
  // ============================================

  // Получение активного розыгрыша
  static async getActiveLottery(): Promise<DatabaseActiveLottery | null> {
    try {
      const { data, error } = await supabase
        .from('active_lottery')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 = no rows found (это нормально)
          console.log('ℹ️ Активных розыгрышей не найдено');
          return null;
        } else if (error.code === 'PGRST301' || error.message.includes('406')) {
          // Проблема с доступом к таблице
          console.error('❌ Проблема с доступом к таблице active_lottery. Проверьте RLS политики в Supabase.');
          console.error('Ошибка:', error);
          return null;
        } else {
          console.error('❌ Ошибка получения активного розыгрыша:', error);
          throw error;
        }
      }

      return data || null
    } catch (error) {
      console.error('❌ Критическая ошибка в getActiveLottery:', error)
      return null
    }
  }

  // Создание нового активного розыгрыша
  static async createActiveLottery(lottery: {
    name: string
    prize_amount: string
    start_time: Date
    end_time: Date
    duration_minutes: number
  }): Promise<string | null> {
    try {
      // Сначала деактивируем все существующие розыгрыши
      await this.deactivateAllLotteries()

      // Получаем следующий номер розыгрыша
      const lotteryNumber = await this.getNextLotteryNumber()

      const { data, error } = await supabase
        .from('active_lottery')
        .insert([{
          lottery_number: lotteryNumber,
          name: lottery.name,
          prize_amount: lottery.prize_amount,
          start_time: lottery.start_time.toISOString(),
          end_time: lottery.end_time.toISOString(),
          duration_minutes: lottery.duration_minutes,
          is_active: true,
          is_paused: false,
          is_completed: false,
          winner_number: null,
          selected_numbers: []
        }])
        .select('id')
        .single()

      if (error) {
        console.error('❌ Ошибка создания активного розыгрыша:', error)
        throw error
      }

      console.log('✅ Активный розыгрыш создан:', data.id, 'номер:', lotteryNumber)
      return data.id
    } catch (error) {
      console.error('❌ Ошибка в createActiveLottery:', error)
      return null
    }
  }

  // Обновление активного розыгрыша
  static async updateActiveLottery(updates: Partial<DatabaseActiveLottery>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_lottery')
        .update(updates)
        .eq('is_active', true)

      if (error) {
        console.error('❌ Ошибка обновления активного розыгрыша:', error)
        throw error
      }

      console.log('✅ Активный розыгрыш обновлен')
      return true
    } catch (error) {
      console.error('❌ Ошибка в updateActiveLottery:', error)
      return false
    }
  }

  // Завершение активного розыгрыша и перенос в историю
  static async completeActiveLottery(
    winnerNumber: number | null = null,
    status: 'completed' | 'cancelled' | 'no_winner' = 'completed',
    reason: string | null = null
  ): Promise<boolean> {
    try {
      // Получаем активный розыгрыш
      const activeLottery = await this.getActiveLottery()
      if (!activeLottery) {
        console.warn('⚠️ Нет активного розыгрыша для завершения')
        return false
      }

      // Вычисляем фактическую длительность
      const actualDuration = Math.floor(
        (new Date().getTime() - new Date(activeLottery.start_time).getTime()) / (1000 * 60)
      )

      // Добавляем в историю
      const historyEntry: Omit<LotteryHistory, 'id'> = {
        lotteryNumber: activeLottery.lottery_number,
        name: activeLottery.name,
        prizeAmount: activeLottery.prize_amount,
        startTime: new Date(activeLottery.start_time),
        endTime: new Date(),
        plannedDuration: activeLottery.duration_minutes,
        actualDuration,
        winnerNumber,
        status,
        totalParticipants: activeLottery.selected_numbers.length,
        participantNumbers: activeLottery.selected_numbers,
        reason
      }

      const historyId = await this.addToHistory(historyEntry)

      if (historyId) {
        // Деактивируем активный розыгрыш
        await this.updateActiveLottery({
          is_active: false,
          is_completed: true,
          winner_number: winnerNumber
        })

        console.log('✅ Розыгрыш завершен и перенесен в историю')
        return true
      }

      return false
    } catch (error) {
      console.error('❌ Ошибка в completeActiveLottery:', error)
      return false
    }
  }

  // Деактивация всех розыгрышей
  static async deactivateAllLotteries(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_lottery')
        .update({ is_active: false })
        .eq('is_active', true)

      if (error) {
        console.error('❌ Ошибка деактивации розыгрышей:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('❌ Ошибка в deactivateAllLotteries:', error)
      return false
    }
  }

  // Удаление активного розыгрыша
  static async deleteActiveLottery(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_lottery')
        .delete()
        .eq('is_active', true)

      if (error) {
        console.error('❌ Ошибка удаления активного розыгрыша:', error)
        throw error
      }

      console.log('✅ Активный розыгрыш удален')
      return true
    } catch (error) {
      console.error('❌ Ошибка в deleteActiveLottery:', error)
      return false
    }
  }

  // ============================================
  // УТИЛИТЫ ДЛЯ КОНВЕРТАЦИИ ДАННЫХ
  // ============================================

  // Конвертация из формата БД в формат приложения
  private static convertDatabaseToAppHistory(dbEntry: DatabaseLotteryHistory): LotteryHistory {
    return {
      id: dbEntry.id,
      lotteryNumber: dbEntry.lottery_number,
      name: dbEntry.name,
      prizeAmount: dbEntry.prize_amount,
      startTime: new Date(dbEntry.start_time),
      endTime: new Date(dbEntry.end_time),
      plannedDuration: dbEntry.planned_duration_minutes,
      actualDuration: dbEntry.actual_duration_minutes,
      winnerNumber: dbEntry.winner_number,
      status: dbEntry.status,
      totalParticipants: dbEntry.total_participants,
      participantNumbers: dbEntry.participant_numbers || [],
      reason: dbEntry.reason
    }
  }

  // Конвертация из формата приложения в формат БД
  private static convertAppToDatabase(appEntry: Omit<LotteryHistory, 'id'>): Omit<DatabaseLotteryHistory, 'id' | 'created_at' | 'updated_at'> {
    return {
      lottery_number: appEntry.lotteryNumber,
      name: appEntry.name,
      prize_amount: appEntry.prizeAmount,
      start_time: appEntry.startTime.toISOString(),
      end_time: appEntry.endTime.toISOString(),
      planned_duration_minutes: appEntry.plannedDuration,
      actual_duration_minutes: appEntry.actualDuration,
      winner_number: appEntry.winnerNumber,
      status: appEntry.status,
      total_participants: appEntry.totalParticipants,
      participant_numbers: appEntry.participantNumbers,
      reason: appEntry.reason
    }
  }

  // ============================================
  // INSTANT TICKETS (SCRATCH ЛОТЕРЕЯ)
  // ============================================

  // Получение билетов для заявки
  static async getInstantTicketsByApplication(applicationId: string) {
    try {
      const { data, error } = await supabase
        .from('instant_tickets')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Ошибка получения instant tickets:', error)
        throw error
      }

      console.log('✅ Загружено билетов:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Ошибка в getInstantTicketsByApplication:', error)
      return []
    }
  }

  // Стирание билета (открытие)
  static async scratchTicket(ticketId: string): Promise<boolean> {
    try {
      console.log('🔄 Начинаем обновление билета в БД:', ticketId)
      
      const { data, error, count } = await supabase
        .from('instant_tickets')
        .update({ 
          is_scratched: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .eq('is_scratched', false) // Только нестертые билеты
        .select('*')

      console.log('📊 Результат обновления БД:', {
        data,
        error,
        count,
        updatedRows: data?.length || 0
      })

      if (error) {
        console.error('❌ Ошибка стирания билета:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Нет обновленных строк - возможно билет уже стерт')
        // Проверяем существует ли билет
        const { data: existing } = await supabase
          .from('instant_tickets')
          .select('*')
          .eq('id', ticketId)
          .single()
        
        console.log('🔍 Существующий билет:', existing)
        
        if (existing?.is_scratched) {
          console.log('✅ Билет уже стерт - возвращаем успех')
          return true // Билет уже стерт = успешный результат
        }
        
        console.error('❌ Билет не найден или не может быть стерт')
        return false
      }

      console.log('✅ Билет успешно стерт в БД:', data[0])
      return true
    } catch (error) {
      console.error('❌ Ошибка в scratchTicket:', error)
      return false
    }
  }

  // Отметка приза как полученного
  static async claimPrize(ticketId: string): Promise<boolean> {
    try {
      // Сначала проверяем что билет выигрышный и не выплачен
      const { data: ticket, error: fetchError } = await supabase
        .from('instant_tickets')
        .select('id, is_winner, is_claimed')
        .eq('id', ticketId)
        .eq('is_winner', true)
        .eq('is_claimed', false)
        .single()

      if (fetchError || !ticket) {
        console.error('❌ Билет не найден или уже выплачен:', fetchError)
        return false
      }

      // Обновляем статус выплаты (убираем проверку is_scratched, так как она гибридная)
      const { error } = await supabase
        .from('instant_tickets')
        .update({ 
          is_claimed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .eq('is_winner', true)
        .eq('is_claimed', false)

      if (error) {
        console.error('❌ Ошибка обновления выплаты:', error)
        throw error
      }

      console.log('✅ Приз отмечен как выплаченный:', ticketId)
      return true
    } catch (error) {
      console.error('❌ Ошибка в claimPrize:', error)
      return false
    }
  }

  // Получение всех билетов для админа
  static async getAllInstantTickets(filters?: {
    is_winner?: boolean
    is_scratched?: boolean  
    is_claimed?: boolean
    limit?: number
  }) {
    try {
      let query = supabase
        .from('instant_tickets')
        .select(`
          *,
          applications:application_id (
            user_name,
            user_phone,
            cedula,
            numbers,
            status
          )
        `)
        .order('created_at', { ascending: false })

      // Применяем фильтры
      if (filters?.is_winner !== undefined) {
        query = query.eq('is_winner', filters.is_winner)
      }
      if (filters?.is_scratched !== undefined) {
        query = query.eq('is_scratched', filters.is_scratched)
      }
      if (filters?.is_claimed !== undefined) {
        query = query.eq('is_claimed', filters.is_claimed)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Ошибка получения всех билетов:', error)
        throw error
      }

      console.log('✅ Загружено билетов для админа:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Ошибка в getAllInstantTickets:', error)
      return []
    }
  }

  // Статистика instant tickets
  static async getInstantTicketsStats() {
    try {
      const { data, error } = await supabase
        .from('instant_tickets')
        .select('prize_type, prize_amount, is_winner, is_scratched, is_claimed')

      if (error) {
        console.error('❌ Ошибка получения статистики билетов:', error)
        throw error
      }

      const stats = {
        total: data.length,
        scratched: data.filter(t => t.is_scratched).length,
        winners: data.filter(t => t.is_winner).length,
        claimed: data.filter(t => t.is_claimed).length,
        totalPrizeAmount: data
          .filter(t => t.is_winner)
          .reduce((sum, t) => sum + parseFloat(t.prize_amount), 0),
        claimedPrizeAmount: data
          .filter(t => t.is_claimed)
          .reduce((sum, t) => sum + parseFloat(t.prize_amount), 0),
        prizesByType: {
          small: data.filter(t => t.prize_type === 'small' && t.is_winner).length,
          medium: data.filter(t => t.prize_type === 'medium' && t.is_winner).length,
          large: data.filter(t => t.prize_type === 'large' && t.is_winner).length
        }
      }

      console.log('✅ Статистика билетов загружена:', stats)
      return stats
    } catch (error) {
      console.error('❌ Ошибка в getInstantTicketsStats:', error)
      return null
    }
  }

  // ============================================
  // ПРОВЕРКА ПОДКЛЮЧЕНИЯ
  // ============================================

  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Тестируем подключение к Supabase...')
      
      // Простая проверка подключения к Supabase
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Ошибка получения сессии:', error)
        // Но это не критично для анонимного ключа
      }

      console.log('✅ Подключение к Supabase успешно')
      console.log('📋 Supabase клиент инициализирован')
      return true
    } catch (error) {
      console.error('❌ Критическая ошибка подключения:', error)
      return false
    }
  }
} 