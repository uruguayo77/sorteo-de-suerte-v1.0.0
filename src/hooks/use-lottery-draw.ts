import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LotteryDraw {
  id: string
  draw_name: string
  draw_date: string
  status: 'scheduled' | 'active' | 'finished' | 'cancelled'
  winner_number?: number
  winner_name?: string
  winner_cedula?: string
  prize_amount: number
  time_remaining?: string
  created_at?: string
}

export interface CreateDrawData {
  draw_name: string
  draw_date: string
  prize_amount: number
  created_by: string
}

export interface LotterySetting {
  setting_key: string
  setting_value: string
  description?: string
  updated_at: string
}

// Хук для получения текущего активного розыгрыша
export const useCurrentDraw = () => {
  return useQuery({
    queryKey: ['currentDraw'],
    queryFn: async () => {
      // Временно возвращаем null, так как мы используем Zustand store для управления лотереями
      // Эта функция может быть интегрирована позже, если потребуется
      return null as LotteryDraw | null
    },
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  })
}

// Хук для получения всех розыгрышей (для админа)
export const useAllDraws = () => {
  return useQuery({
    queryKey: ['allDraws'],
    queryFn: async () => {
      // Временно возвращаем пустой массив, так как мы используем Zustand store
      return [] as LotteryDraw[]
    },
    refetchInterval: 30000,
  })
}

// Хук для создания нового розыгрыша
export const useCreateDraw = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (drawData: CreateDrawData) => {
      const { data, error } = await supabase.rpc('create_lottery_draw', {
        draw_name_input: drawData.draw_name,
        draw_date_input: drawData.draw_date,
        prize_amount_input: drawData.prize_amount,
        created_by_input: drawData.created_by
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDraws'] })
      queryClient.invalidateQueries({ queryKey: ['currentDraw'] })
    },
  })
}

// Хук для установки победителя
export const useSetWinner = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      drawId, 
      winnerNumber, 
      adminId 
    }: { 
      drawId: string
      winnerNumber: number
      adminId: string 
    }) => {
      const { data, error } = await supabase.rpc('set_draw_winner', {
        draw_id_input: drawId,
        winner_number_input: winnerNumber,
        admin_id_input: adminId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDraws'] })
      queryClient.invalidateQueries({ queryKey: ['currentDraw'] })
    },
  })
}

// Хук для обновления статуса розыгрышей
export const useUpdateDrawStatus = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('update_draw_status_to_active')
      
      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentDraw'] })
      queryClient.invalidateQueries({ queryKey: ['allDraws'] })
    },
  })
}

// Хук для получения настроек лотереи - убираем заглушку, используем настоящие хуки из use-supabase.ts
// export const useLotterySettings = () => {
//   Используйте useLotterySettings из '@/hooks/use-supabase' вместо этого
// }

// Хук для получения конкретной настройки
export const useLotterySetting = (settingKey: string) => {
  return useQuery({
    queryKey: ['lotterySetting', settingKey],
    queryFn: async () => {
      // Временно возвращаем пустую строку
      return '' as string
    },
    enabled: !!settingKey,
  })
}

// Хук для обновления настройки
export const useUpdateLotterySetting = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      settingKey, 
      settingValue, 
      adminId 
    }: { 
      settingKey: string
      settingValue: string
      adminId: string 
    }) => {
      const { data, error } = await supabase.rpc('update_lottery_setting', {
        setting_key_input: settingKey,
        setting_value_input: settingValue,
        admin_id_input: adminId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotterySettings'] })
      queryClient.invalidateQueries({ queryKey: ['lotterySetting'] })
    },
  })
}

// Утилитарные функции
export const formatTimeRemaining = (timeRemaining: string): string => {
  if (!timeRemaining || timeRemaining === '00:00:00') return '00:00:00'
  
  const parts = timeRemaining.split(':')
  if (parts.length >= 3) {
    const hours = parseInt(parts[0])
    const minutes = parseInt(parts[1])
    const seconds = parseInt(parts[2])
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }
  
  return timeRemaining
}

export const isDrawExpired = (drawDate: string): boolean => {
  return new Date(drawDate) <= new Date()
}

export const getDrawStatusText = (status: string): string => {
  switch (status) {
    case 'scheduled':
      return 'Programado'
    case 'active':
      return 'En Curso'
    case 'finished':
      return 'Finalizado'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}

export const getDrawStatusColor = (status: string): string => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'active':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'finished':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'cancelled':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
} 