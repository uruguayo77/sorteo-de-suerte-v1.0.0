import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, NumberReservation, Winner } from '@/lib/supabase'

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