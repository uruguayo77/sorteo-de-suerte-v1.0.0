import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, NumberReservation, Winner, Application, ApplicationWithDraw, CreateApplicationData, UpdateApplicationData, LotterySettings, LotteryDraw, CreateLotteryDrawData, UpdateLotterySettingData, Participant, CreateParticipantData, ParticipantSelection, CreateParticipantSelectionData, TemporaryReservation, ReservationResult } from '@/lib/supabase'

// Хук для получения занятых номеров
export const useOccupiedNumbers = () => {
  return useQuery({
    queryKey: ['occupiedNumbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('number_reservations')
        .select('number')
        .eq('status', 'confirmed')
      
      if (error) throw error
      return new Set(data?.map(item => item.number) || [])
    },
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  })
}

// Хук для создания резервации номера
export const useCreateReservation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (reservation: Omit<NumberReservation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('number_reservations')
        .insert([reservation])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Обновляем кэш занятых номеров
      queryClient.invalidateQueries({ queryKey: ['occupiedNumbers'] })
    },
  })
}

// Хук для получения победителей
export const useWinners = () => {
  return useQuery({
    queryKey: ['winners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Winner[]
    },
    refetchInterval: 60000, // Обновляем каждую минуту
  })
}

// Хук для проверки статуса резервации
export const useReservationStatus = (number: number | null) => {
  return useQuery({
    queryKey: ['reservationStatus', number],
    queryFn: async () => {
      if (!number) return null
      
      const { data, error } = await supabase
        .from('number_reservations')
        .select('*')
        .eq('number', number)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error // PGRST116 = не найдено
      return data as NumberReservation | null
    },
    enabled: !!number,
  })
}

// Хук для получения статистики
export const useStatistics = () => {
  return useQuery({
    queryKey: ['statistics'],
    queryFn: async () => {
      const { data: reservations, error: reservationsError } = await supabase
        .from('number_reservations')
        .select('*')
      
      const { data: winners, error: winnersError } = await supabase
        .from('winners')
        .select('*')
      
      if (reservationsError) throw reservationsError
      if (winnersError) throw winnersError
      
      return {
        totalReservations: reservations?.length || 0,
        confirmedReservations: reservations?.filter(r => r.status === 'confirmed').length || 0,
        totalWinners: winners?.length || 0,
        totalPrizeAmount: winners?.reduce((sum, w) => sum + parseFloat(w.prize_amount), 0) || 0,
      }
    },
    refetchInterval: 300000, // Обновляем каждые 5 минут
  })
} 

// Хук для создания заявки
export const useCreateApplication = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (applicationData: CreateApplicationData) => {
      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single()
      
      if (error) throw error
      return data as Application
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupiedNumbers'] })
      queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

// Хук для получения всех заявок (для админа)
export const useApplications = () => {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Application[]
    },
    refetchInterval: 30000,
  })
}

// Хук для обновления статуса заявки (для админа)
export const useUpdateApplication = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: UpdateApplicationData }) => {
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as Application
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['occupiedNumbers'] })
      queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] })
    },
  })
}

// Хук для завершения временной заявки (заполнение данных пользователя)
export const useCompleteTemporaryApplication = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      userData 
    }: { 
      applicationId: string
      userData: {
        user_name: string
        user_phone: string
        cedula: string
        payment_method: string
        payment_proof_url: string
      }
    }) => {
      const { data, error } = await supabase
        .from('applications')
        .update({
          ...userData,
          // Убираем reserved_until - заявка больше не временная
          reserved_until: null
        })
        .eq('id', applicationId)
        .select()
        .single()
      
      if (error) throw error
      return data as Application
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] })
      queryClient.invalidateQueries({ queryKey: ['temporary-reservation-status'] })
    },
  })
}

// Хук для получения заблокированных номеров (включая временные блокировки)
export const useBlockedNumbers = () => {
  return useQuery({
    queryKey: ['blockedNumbers'],
    queryFn: async () => {
      console.log('useBlockedNumbers: fetching all blocked numbers...')
      
      try {
        // Используем новую функцию для получения всех заблокированных номеров
        const { data, error } = await supabase.rpc('get_all_blocked_numbers')
        
        console.log('useBlockedNumbers result:', { data, error })
        
        if (error) throw error
        
        // data - это массив чисел, конвертируем в Set
        const blockedNumbers = new Set(data || [])
        console.log('All blocked numbers (permanent + temporary):', Array.from(blockedNumbers))
        return blockedNumbers
      } catch (error) {
        console.error('useBlockedNumbers error:', error)
        // В случае ошибки возвращаем пустой набор, чтобы показать все номера как доступные
        return new Set()
      }
    },
    refetchInterval: 10000, // Обновляем каждые 10 секунд для актуальности временных блокировок
  })
}

// Хук для временной блокировки чисел на 15 минут
export const useReserveNumbersTemporarily = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      numbers,
      userName,
      userPhone,
      cedula,
      paymentMethod,
      reservationMinutes = 15
    }: {
      numbers: number[]
      userName: string
      userPhone: string
      cedula: string
      paymentMethod: string
      reservationMinutes?: number
    }) => {
      const { data, error } = await supabase.rpc('reserve_numbers_temporarily', {
        p_numbers: numbers,
        p_user_name: userName,
        p_user_phone: userPhone,
        p_cedula: cedula,
        p_payment_method: paymentMethod,
        p_reservation_minutes: reservationMinutes
      })
      
      if (error) throw error
      return data[0] // Возвращаем первую (и единственную) строку результата
    },
    onSuccess: (data) => {
      // Обновляем кэш заблокированных номеров
      queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] })
      
      console.log('Numbers reserved temporarily:', {
        applicationId: data.application_id,
        reservedUntil: data.reserved_until,
        blockedNumbers: data.blocked_numbers
      })
    },
    onError: (error) => {
      console.error('Failed to reserve numbers:', error)
    }
  })
}

// Хук для проверки статуса временной блокировки
export const useTemporaryReservationStatus = (applicationId?: string) => {
  return useQuery({
    queryKey: ['temporary-reservation-status', applicationId],
    queryFn: async () => {
      if (!applicationId) return null
      
      const { data, error } = await supabase
        .from('applications')
        .select('id, numbers, reserved_until, status, user_name')
        .eq('id', applicationId)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      // Проверяем, не истекла ли резервация
      if (data?.reserved_until) {
        const reservedUntil = new Date(data.reserved_until)
        const now = new Date()
        
        return {
          ...data,
          isExpired: reservedUntil <= now,
          timeRemaining: Math.max(0, reservedUntil.getTime() - now.getTime()),
          minutesRemaining: Math.max(0, Math.ceil((reservedUntil.getTime() - now.getTime()) / 60000))
        }
      }
      
      return data
    },
    enabled: !!applicationId,
    refetchInterval: 5000, // Обновляем каждые 5 секунд для отображения таймера
  })
}

// Хук для очистки просроченных резерваций (для админов)
export const useCleanupExpiredReservations = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cleanup_expired_reservations')
      
      if (error) throw error
      return data
    },
    onSuccess: (cleanedCount) => {
      queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      
      console.log('Cleaned expired reservations:', cleanedCount)
    }
  })
}

// Хук для загрузки файла компробанте
export const useUploadPaymentProof = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file)
      
      if (error) throw error
      return data.path
    },
  })
} 

// ============ LOTTERY SETTINGS HOOKS ============

export function useLotterySettings() {
  return useQuery({
    queryKey: ['lottery-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lottery_settings')
        .select('*')
        .order('setting_key')
      
      if (error) throw error
      return data as LotterySettings[]
    }
  })
}

export function useLotterySetting(settingKey: string) {
  return useQuery({
    queryKey: ['lottery-setting', settingKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lottery_settings')
        .select('*')
        .eq('setting_key', settingKey)
        .single()
      
      if (error) throw error
      return data as LotterySettings
    }
  })
}

export function useUpdateLotterySetting() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ settingKey, updateData }: { 
      settingKey: string
      updateData: UpdateLotterySettingData 
    }) => {
      const { data, error } = await supabase
        .from('lottery_settings')
        .update(updateData)
        .eq('setting_key', settingKey)
        .select()
        .single()
      
      if (error) throw error
      return data as LotterySettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lottery-settings'] })
    }
  })
}

export function useCreateLotterySetting() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newSetting: Omit<LotterySettings, 'id' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lottery_settings')
        .insert(newSetting)
        .select()
        .single()
      
      if (error) throw error
      return data as LotterySettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lottery-settings'] })
    }
  })
}

// ============ LOTTERY DRAWS HOOKS ============

export function useLotteryDraws() {
  return useQuery({
    queryKey: ['lottery-draws'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lottery_draws')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as LotteryDraw[]
    }
  })
}

export function useLotteryDraw(drawId: string) {
  return useQuery({
    queryKey: ['lottery-draw', drawId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lottery_draws')
        .select('*')
        .eq('id', drawId)
        .single()
      
      if (error) throw error
      return data as LotteryDraw
    }
  })
}

export function useCreateLotteryDraw() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newDraw: CreateLotteryDrawData) => {
      const { data, error } = await supabase
        .from('lottery_draws')
        .insert(newDraw)
        .select()
        .single()
      
      if (error) throw error
      return data as LotteryDraw
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lottery-draws'] })
    }
  })
}

export function useUpdateLotteryDraw() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ drawId, updateData }: {
      drawId: string
      updateData: Partial<Omit<LotteryDraw, 'id' | 'created_at' | 'updated_at'>>
    }) => {
      const { data, error } = await supabase
        .from('lottery_draws')
        .update(updateData)
        .eq('id', drawId)
        .select()
        .single()
      
      if (error) throw error
      return data as LotteryDraw
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lottery-draws'] })
    }
  })
}

export function useDeleteLotteryDraw() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (drawId: string) => {
      const { error } = await supabase
        .from('lottery_draws')
        .delete()
        .eq('id', drawId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lottery-draws'] })
    }
  })
}

// ============ PARTICIPANTS HOOKS ============

export function useParticipants() {
  return useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Participant[]
    }
  })
}

export function useCreateParticipant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newParticipant: CreateParticipantData) => {
      const { data, error } = await supabase
        .from('participants')
        .insert(newParticipant)
        .select()
        .single()
      
      if (error) throw error
      return data as Participant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
    }
  })
}

// ============ PARTICIPANT SELECTIONS HOOKS ============

export function useParticipantSelections(participantId?: string) {
  return useQuery({
    queryKey: ['participant-selections', participantId],
    queryFn: async () => {
      let query = supabase
        .from('participant_selections')
        .select('*')
        .order('selected_at', { ascending: false })
      
      if (participantId) {
        query = query.eq('participant_id', participantId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as ParticipantSelection[]
    }
  })
}

export function useCreateParticipantSelection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newSelection: CreateParticipantSelectionData) => {
      const { data, error } = await supabase
        .from('participant_selections')
        .insert(newSelection)
        .select()
        .single()
      
      if (error) throw error
      return data as ParticipantSelection
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-selections'] })
    }
  })
} 

// ============ ЗАЯВКИ С РОЗЫГРЫШАМИ ============

export function useApplicationsWithDraws() {
  return useQuery({
    queryKey: ['applications-with-draws'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_applications_with_draw')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as ApplicationWithDraw[]
    }
  })
}

export function useApplicationsByDraw(drawId?: string) {
  return useQuery({
    queryKey: ['applications-by-draw', drawId],
    queryFn: async () => {
      if (!drawId) return []
      
      const { data, error } = await supabase
        .from('v_applications_with_draw')
        .select('*')
        .eq('draw_id', drawId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as ApplicationWithDraw[]
    },
    enabled: !!drawId
  })
}

export function useApplicationsGroupedByDraw() {
  return useQuery({
    queryKey: ['applications-grouped-by-draw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_applications_with_draw')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Группируем заявки по розыгрышам
      const grouped = (data as ApplicationWithDraw[]).reduce((acc, app) => {
        const drawKey = app.draw_id || 'no-draw'
        const drawName = app.draw_name || 'Без розыгрыша'
        
        if (!acc[drawKey]) {
          acc[drawKey] = {
            draw_id: app.draw_id,
            draw_name: drawName,
            draw_date: app.draw_date,
            draw_status: app.draw_status,
            prize_description: app.prize_description,
            winner_number: app.winner_number,
            winner_name: app.winner_name,
            applications: []
          }
        }
        
        acc[drawKey].applications.push(app)
        return acc
      }, {} as Record<string, {
        draw_id: string | null
        draw_name: string
        draw_date?: string
        draw_status?: string
        prize_description?: string
        winner_number?: number
        winner_name?: string
        applications: ApplicationWithDraw[]
      }>)
      
      // Конвертируем в массив и сортируем по дате розыгрыша
      return Object.values(grouped).sort((a, b) => {
        if (!a.draw_date && !b.draw_date) return 0
        if (!a.draw_date) return 1
        if (!b.draw_date) return -1
        return new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime()
      })
    }
  })
}

// Отмена временной резервации
export function useCancelTemporaryReservation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase.rpc('cancel_temporary_reservation', {
        p_application_id: applicationId
      })
      
      if (error) {
        console.error('Failed to cancel reservation:', error)
        throw error
      }
      
      return data[0] // Returns { success, message, freed_numbers }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] })
      queryClient.invalidateQueries({ queryKey: ['temporary-reservation-status'] })
    },
    onError: (error) => {
      console.error('Failed to cancel reservation:', error)
    }
  })
}