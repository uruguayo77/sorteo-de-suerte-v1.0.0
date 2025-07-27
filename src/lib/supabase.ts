import { createClient } from '@supabase/supabase-js'

// Получение URL и анонимного ключа из переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Проверка наличия переменных окружения
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required. Please check your .env.local file.')
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required. Please check your .env.local file.')
}

// Создание клиента Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для базы данных
export interface DatabaseLotteryHistory {
  id: string
  lottery_number: number // Номер розыгрыша для отслеживания
  name: string
  prize_description: string
  prize_image_1?: string
  prize_image_2?: string
  prize_image_3?: string
  start_time: string
  end_time: string
  planned_duration_minutes: number
  actual_duration_minutes: number
  winner_number: number | null
  status: 'completed' | 'cancelled' | 'no_winner'
  total_participants: number
  participant_numbers: number[]
  reason: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseActiveLottery {
  id: string
  lottery_number: number // Номер текущего розыгрыша
  name: string
  prize_description: string
  prize_image_1?: string
  prize_image_2?: string
  prize_image_3?: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_active: boolean
  is_paused: boolean
  is_completed: boolean
  winner_number: number | null
  selected_numbers: number[]
  created_at: string
  updated_at: string
}

export interface NumberReservation {
  id: number
  number: number
  user_name: string
  user_phone: string
  payment_method: string
  payment_details: string
  status: 'pending' | 'confirmed' | 'cancelled'
  application_id?: string // Связь с заявкой
  created_at: string
  updated_at: string
}

export interface Winner {
  id: number
  number: number
  user_name: string
  user_phone: string
  prize_amount: string
  claimed: boolean
  created_at: string
}

// Новый тип для заявок пользователей
export interface Application {
  id: string
  numbers: number[]
  user_name: string
  user_phone: string
  cedula: string
  payment_method: string
  payment_proof_url?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  draw_id?: string | null
  reserved_until?: string // Временная блокировка на 15 минут
  created_at: string
  updated_at: string
}

// Тип для заявки с информацией о розыгрыше
export interface ApplicationWithDraw extends Application {
  draw_name?: string
  draw_date?: string
  draw_status?: 'scheduled' | 'active' | 'finished' | 'cancelled'
  prize_description?: string
  winner_number?: number
  winner_name?: string
}

// Тип для создания новой заявки
export type CreateApplicationData = Omit<Application, 'id' | 'created_at' | 'updated_at' | 'status' | 'admin_notes'>

// Тип для обновления заявки (только для админа)
export type UpdateApplicationData = {
  status: Application['status']
  admin_notes?: string
}

// Тип для временной блокировки чисел
export interface TemporaryReservation {
  numbers: number[]
  userName: string
  userPhone: string
  cedula: string
  paymentMethod: string
  reservationMinutes?: number
}

// Тип результата временной блокировки
export interface ReservationResult {
  application_id: string
  reserved_until: string
  blocked_numbers: number[]
} 

// ============ НОВЫЕ ТИПЫ ДЛЯ СИНХРОНИЗАЦИИ ============

// Настройки лотереи
export interface LotterySettings {
  id: string
  setting_key: string
  setting_value: string
  description?: string
  updated_by?: string
  updated_at: string
}

// Розыгрыши лотереи
export interface LotteryDraw {
  id: string
  draw_name: string
  draw_date: string
  end_date?: string // Время окончания розыгрыша
  duration_minutes?: number // Продолжительность розыгрыша в минутах
  status: 'scheduled' | 'active' | 'finished' | 'cancelled'
  winner_number?: number
  winner_name?: string
  winner_cedula?: string
  prize_description: string
  prize_image_1?: string
  prize_image_2?: string
  prize_image_3?: string
  scheduled_start_time?: string // Время отложенного запуска
  number_price_bs: number // Цена номера в боливарах
  number_price_usd: number // Цена номера в долларах
  usd_to_bs_rate: number // Курс доллара к боливару
  created_by?: string
  created_at: string
  updated_at: string
}

// Участники (анонимные)
export interface Participant {
  id: string
  session_id?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Выбор номеров участниками
export interface ParticipantSelection {
  id: string
  lottery_id?: string
  participant_id?: string
  selected_number: number
  selected_at: string
}

// ============ ТИПЫ ДЛЯ СОЗДАНИЯ ============

export interface CreateApplicationData {
  numbers: number[]
  user_name: string
  user_phone: string
  cedula: string
  payment_method: string
  payment_proof_url?: string
}

export interface CreateLotteryDrawData {
  draw_name: string
  draw_date?: string // Теперь опционально - будет установлено сервером при создании
  end_date?: string // Время окончания розыгрыша
  duration_minutes?: number // Продолжительность розыгрыша в минутах
  prize_description: string
  prize_image_1?: string
  prize_image_2?: string
  prize_image_3?: string
  scheduled_start_time?: string // Время отложенного запуска (требует миграции)
  number_price_bs?: number // Цена номера в боливарах
  number_price_usd?: number // Цена номера в долларах
  usd_to_bs_rate?: number // Курс доллара к боливару
  // created_by убрано - автоматически назначается в БД
}

export interface CreateParticipantData {
  session_id?: string
  ip_address?: string
  user_agent?: string
}

export interface CreateParticipantSelectionData {
  lottery_id?: string
  participant_id?: string
  selected_number: number
}

export interface UpdateLotterySettingData {
  setting_value: string
  updated_by?: string
} 