import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yetjflxjxujdhemailxx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldGpmbHhqeHVqZGhlbWFpbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjgyODAsImV4cCI6MjA2ODkwNDI4MH0.9NPUrz0RvqPyzcVsEMBp3f213kFZIbJfvmwE_0CtCPo'

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY не найден!')
  console.error('📝 Создайте файл .env.local с вашим анонимным ключом Supabase')
  console.error('🔗 См. файл GET_SUPABASE_KEY.md для инструкций')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для базы данных
export interface NumberReservation {
  id: number
  number: number
  user_name: string
  user_phone: string
  payment_method: string
  payment_details: string
  status: 'pending' | 'confirmed' | 'cancelled'
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