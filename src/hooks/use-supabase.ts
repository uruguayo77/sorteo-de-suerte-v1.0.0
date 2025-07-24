import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, NumberReservation, Winner, Application, CreateApplicationData, UpdateApplicationData } from '@/lib/supabase'

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

// Хук для получения заблокированных номеров (заменяет useOccupiedNumbers) - временная упрощенная версия
export const useBlockedNumbers = () => {
  return useQuery({
    queryKey: ['blockedNumbers'],
    queryFn: async () => {
      // Временно возвращаем пустой набор для тестирования
      console.log('useBlockedNumbers: fetching data...')
      
      try {
        // Используем старую логику с confirmed reservations
        const { data, error } = await supabase
          .from('number_reservations')
          .select('number')
          .eq('status', 'confirmed')
        
        console.log('useBlockedNumbers result:', { data, error })
        
        if (error) throw error
        const blockedNumbers = new Set(data?.map(item => item.number) || [])
        console.log('Blocked numbers:', Array.from(blockedNumbers))
        return blockedNumbers
      } catch (error) {
        console.error('useBlockedNumbers error:', error)
        // В случае ошибки возвращаем пустой набор, чтобы показать все номера как доступные
        return new Set()
      }
    },
    refetchInterval: 30000,
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