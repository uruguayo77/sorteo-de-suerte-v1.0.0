import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { OnboardingConfig, UpdateOnboardingData } from '@/types/onboarding'
import { toast } from '@/hooks/use-toast'

// Хук для получения конфигурации онбординга
export const useOnboardingConfig = () => {
  return useQuery({
    queryKey: ['onboarding-config'],
    queryFn: async (): Promise<OnboardingConfig | null> => {
      const { data, error } = await supabase
        .from('onboarding_config')
        .select('*')
        .eq('is_enabled', true)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching onboarding config:', error)
        throw error
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as OnboardingConfig
    },
    refetchInterval: 5000,
    staleTime: 0,
    cacheTime: 0,
  })
}

// Хук для получения конфигурации для админов (включая отключенные)
export const useOnboardingConfigAdmin = () => {
  return useQuery({
    queryKey: ['onboarding-config-admin'],
    queryFn: async (): Promise<OnboardingConfig | null> => {
      const { data, error } = await supabase
        .from('onboarding_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching onboarding config for admin:', error)
        throw error
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as OnboardingConfig
    },
    staleTime: 0,
    cacheTime: 0,
  })
}

// Хук для обновления конфигурации онбординга
export const useUpdateOnboardingConfig = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updateData: UpdateOnboardingData): Promise<OnboardingConfig> => {
      try {
        // Получаем существующую конфигурацию
        const { data: existingConfigs, error: selectError } = await supabase
          .from('onboarding_config')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)

        if (selectError) {
          throw selectError
        }

        const dataToSave = {
          ...updateData,
          updated_at: new Date().toISOString(),
        }

        if (existingConfigs && existingConfigs.length > 0) {
          const existingConfig = existingConfigs[0]
          
          // Обновляем существующую запись
          const { data: updateResult, error: updateError } = await supabase
            .from('onboarding_config')
            .update(dataToSave)
            .eq('id', existingConfig.id)
            .select()
            .single()

          if (updateError) {
            throw updateError
          }

          if (!updateResult) {
            throw new Error('No data returned from update')
          }
          
          return updateResult as OnboardingConfig

        } else {
          // Создаем новую конфигурацию
          const newConfigData = {
            ...dataToSave,
            created_at: new Date().toISOString(),
          }

          const { data: insertedData, error: insertError } = await supabase
            .from('onboarding_config')
            .insert([newConfigData])
            .select()
            .single()

          if (insertError) {
            throw insertError
          }

          return insertedData as OnboardingConfig
        }
      } catch (error) {
        console.error('Mutation error:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      // Инвалидируем кэш для обновления данных
      queryClient.invalidateQueries({ queryKey: ['onboarding-config'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-config-admin'] })
      
      toast({
        title: "¡Éxito!",
        description: "Configuración del onboarding actualizada correctamente",
        variant: "default",
      })
    },
    onError: (error: any) => {
      console.error('Error updating onboarding config:', error)
      
      const errorMessage = error?.message || error?.details || 'Error desconocido'
      toast({
        title: "Error",
        description: `Error al guardar: ${errorMessage}`,
        variant: "destructive",
      })
    },
  })
}

// Хук для загрузки медиафайлов онбординга
export const useUploadOnboardingMedia = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        const { data, error } = await supabase.storage
          .from('onboarding-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (error) {
          throw error
        }
        
        // Получаем публичный URL для файла
        const { data: urlData } = supabase.storage
          .from('onboarding-media')
          .getPublicUrl(data.path)
        
        return urlData.publicUrl
      } catch (error) {
        console.error('Upload failed:', error)
        throw error
      }
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Archivo subido correctamente",
        variant: "default",
      })
    },
    onError: (error) => {
      console.error('Error uploading onboarding media:', error)
      toast({
        title: "Error",
        description: `Error al subir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      })
    },
  })
}

// Хук для управления видимостью онбординга
export const useOnboardingVisibility = () => {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [hasBeenManuallyClosed, setHasBeenManuallyClosed] = useState(false)
  const { data: config, isLoading, refetch } = useOnboardingConfig()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!config) {
      setIsOnboardingOpen(false)
      return
    }

    // Если пользователь вручную закрыл модальное окно в этой сессии, не показываем снова
    if (hasBeenManuallyClosed) {
      return
    }

    const storageKey = `onboarding_shown_${config.id}`
    const hasBeenShown = localStorage.getItem(storageKey) === 'true'

    // Показываем онбординг если:
    // 1. Он включен в конфигурации
    // 2. Либо не показывался ранее, либо настроено показывать каждый раз
    // 3. И пользователь не закрыл его вручную в этой сессии
    const shouldShow = config.is_enabled && (!hasBeenShown || config.show_on_every_visit)

    if (shouldShow && !isOnboardingOpen) {
      setIsOnboardingOpen(true)
    } else if (!shouldShow && isOnboardingOpen) {
      setIsOnboardingOpen(false)
    }
  }, [config, isLoading, isOnboardingOpen, hasBeenManuallyClosed])

  const closeOnboarding = () => {
    setIsOnboardingOpen(false)
    setHasBeenManuallyClosed(true)
    
    if (config && !config.show_on_every_visit) {
      // Запоминаем, что онбординг был показан
      const storageKey = `onboarding_shown_${config.id}`
      localStorage.setItem(storageKey, 'true')
    }
  }

  // Функция для принудительного обновления конфигурации
  const refreshConfig = () => {
    refetch()
  }

  return {
    isOnboardingOpen,
    closeOnboarding,
    refreshConfig,
    config,
    isLoading,
  }
} 