import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { currencyService, CurrencySettings, updateDollarRate } from '@/lib/currencyService'
import { toast } from 'sonner'

// Хук для получения настроек валют
export function useCurrencySettings() {
  return useQuery({
    queryKey: ['currency-settings'],
    queryFn: () => currencyService.getCurrencySettings(),
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchInterval: 30 * 60 * 1000, // Обновляем каждые 30 минут
  })
}

// Хук для получения текущего курса валюты
export function useCurrentRate(currencyCode: string = 'VES') {
  return useQuery({
    queryKey: ['current-rate', currencyCode],
    queryFn: () => currencyService.getCurrentRate(currencyCode),
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchInterval: 10 * 60 * 1000, // Обновляем каждые 10 минут
  })
}

// Хук для обновления курса доллара
export function useUpdateDollarRate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDollarRate,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Курс обновлен: 1 USD = ${result.rate} Bs`)
        // Обновляем кеш
        queryClient.invalidateQueries({ queryKey: ['currency-settings'] })
        queryClient.invalidateQueries({ queryKey: ['current-rate'] })
      } else {
        toast.error(`Ошибка: ${result.error}`)
      }
    },
    onError: (error) => {
      toast.error(`Ошибка при обновлении курса: ${error.message}`)
    }
  })
}

// Хук для конвертации валют
export function useCurrencyConverter() {
  const convertMutation = useMutation({
    mutationFn: ({ amount, from, to }: { amount: number; from?: string; to?: string }) =>
      currencyService.convertCurrency(amount, from, to),
  })

  const convert = useCallback((amount: number, from?: string, to?: string) => {
    return convertMutation.mutateAsync({ amount, from, to })
  }, [convertMutation])

  return {
    convert,
    isConverting: convertMutation.isPending,
    error: convertMutation.error
  }
}

// Хук для автоматического обновления курса
export function useAutoUpdateCurrency() {
  const updateMutation = useUpdateDollarRate()
  const { data: settings } = useCurrencySettings()

  const checkAndUpdate = useCallback(async () => {
    try {
      const shouldUpdate = await currencyService.shouldUpdateRate()
      
      if (shouldUpdate) {
        console.log('Автоматическое обновление курса доллара...')
        updateMutation.mutate()
      }
    } catch (error) {
      console.error('Ошибка при проверке курса:', error)
    }
  }, [updateMutation])

  useEffect(() => {
    // Проверяем сразу при загрузке
    checkAndUpdate()

    // Устанавливаем интервал проверки каждые 30 минут
    const interval = setInterval(checkAndUpdate, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [checkAndUpdate])

  return {
    isUpdating: updateMutation.isPending,
    lastUpdate: settings?.find(s => s.currency_code === 'VES')?.last_updated,
    manualUpdate: () => updateMutation.mutate()
  }
}

// Хук для форматирования валют
export function useCurrencyFormatter() {
  const formatBolivar = useCallback((amount: number) => {
    return currencyService.formatCurrency(amount, 'VES')
  }, [])

  const formatDollar = useCallback((amount: number) => {
    return currencyService.formatCurrency(amount, 'USD')
  }, [])

  const formatCurrency = useCallback((amount: number, currencyCode: string = 'VES') => {
    return currencyService.formatCurrency(amount, currencyCode)
  }, [])

  return {
    formatBolivar,
    formatDollar,
    formatCurrency
  }
}

// Хук для статистики валют
export function useCurrencyStats() {
  return useQuery({
    queryKey: ['currency-stats'],
    queryFn: () => currencyService.getCurrencyStats(),
    staleTime: 10 * 60 * 1000, // 10 минут
    refetchInterval: 15 * 60 * 1000, // Обновляем каждые 15 минут
  })
}

// Хук для отображения информации о курсе
export function useCurrencyInfo() {
  const { data: settings } = useCurrencySettings()
  const { data: rate } = useCurrentRate('VES')
  const { formatCurrency } = useCurrencyFormatter()

  const vesSettings = settings?.find(s => s.currency_code === 'VES')
  
  return {
    currentRate: rate,
    lastUpdated: vesSettings?.last_updated,
    formatRate: (usdAmount: number) => {
      if (!rate) return 'Cargando...'
      const bolivars = usdAmount * rate
      return `$${usdAmount} = ${formatCurrency(bolivars, 'VES')}`
    },
    rateDisplay: rate ? `1 USD = ${formatCurrency(rate, 'VES')}` : 'Cargando...',
    isStale: vesSettings ? 
      ((new Date().getTime() - new Date(vesSettings.last_updated).getTime()) / (1000 * 60 * 60)) > 2 : 
      true // Считаем устаревшим если обновление было больше 2 часов назад
  }
}

// Хук для расчета цены с автоматической конвертацией
export function usePriceCalculator() {
  const { data: rate } = useCurrentRate('VES')
  const { formatCurrency } = useCurrencyFormatter()

  const calculatePrices = useCallback((basePrice: number, baseCurrency: 'USD' | 'VES' = 'USD') => {
    if (!rate) return { usd: basePrice, bs: basePrice }

    if (baseCurrency === 'USD') {
      return {
        usd: basePrice,
        bs: Math.round(basePrice * rate * 100) / 100 // Округляем до 2 знаков
      }
    } else {
      return {
        usd: Math.round((basePrice / rate) * 100) / 100,
        bs: basePrice
      }
    }
  }, [rate])

  const formatPrices = useCallback((usdPrice: number, bsPrice: number) => {
    return {
      usd: formatCurrency(usdPrice, 'USD'),
      bs: formatCurrency(bsPrice, 'VES'),
      both: `${formatCurrency(usdPrice, 'USD')} (${formatCurrency(bsPrice, 'VES')})`
    }
  }, [formatCurrency])

  return {
    calculatePrices,
    formatPrices,
    currentRate: rate,
    isLoading: !rate
  }
} 