import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qrService, QRVerificationData } from '@/lib/qrService'
import { toast } from 'sonner'

// Хук для верификации QR кода
export const useQRVerification = (token?: string) => {
  const [isVerifying, setIsVerifying] = useState(false)
  
  return useQuery({
    queryKey: ['qr-verification', token],
    queryFn: async (): Promise<QRVerificationData | null> => {
      if (!token) {
        throw new Error('Token no proporcionado')
      }

      if (!qrService.isValidTokenFormat(token)) {
        throw new Error('Formato de token inválido')
      }

      setIsVerifying(true)
      try {
        const result = await qrService.verifyQRToken(token)
        return result
      } finally {
        setIsVerifying(false)
      }
    },
    enabled: !!token && qrService.isValidTokenFormat(token),
    retry: (failureCount, error) => {
      // No reintentar en caso de token inválido o заявка не найдена
      if (error?.message?.includes('inválido') || 
          error?.message?.includes('Token no proporcionado') ||
          error?.message?.includes('No se encontró')) {
        return false
      }
      // Reintentar máximo 1 vez для других errores
      return failureCount < 1
    },
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Хук для извлечения токена из URL
export const useQRTokenFromUrl = () => {
  const [token, setToken] = useState<string | null>(null)
  const [isValidToken, setIsValidToken] = useState(false)

  useEffect(() => {
    const extractedToken = qrService.extractTokenFromUrl()
    setToken(extractedToken)
    setIsValidToken(extractedToken ? qrService.isValidTokenFormat(extractedToken) : false)
  }, [])

  return { token, isValidToken }
}

// Хук для генерации QR кода
export const useGenerateQRCode = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (applicationId: string): Promise<string> => {
      if (!applicationId) {
        throw new Error('ID de aplicación requerido')
      }

      return await qrService.generateQRCode(applicationId)
    },
    onSuccess: (qrCodeUrl, applicationId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] })
      
      toast.success('Código QR generado exitosamente', {
        description: 'Ya puedes descargar o compartir tu código QR'
      })
    },
    onError: (error) => {
      console.error('Error generating QR code:', error)
      toast.error('Error al generar QR', {
        description: error instanceof Error ? error.message : 'No se pudo generar el código QR'
      })
    }
  })
}

// Хук для получения информации о статусе заявки
export const useApplicationStatus = (verificationData: QRVerificationData | null) => {
  const getStatusInfo = () => {
    if (!verificationData) {
      return {
        status: 'unknown',
        statusText: 'Estado desconocido',
        statusColor: 'text-gray-400',
        statusIcon: '❓',
        description: 'No se pudo obtener información del estado'
      }
    }

    const { status } = verificationData
    
    return {
      status,
      statusText: qrService.getStatusText(status),
      statusColor: qrService.getStatusColor(status),
      statusIcon: qrService.getStatusIcon(status),
      description: getStatusDescription(status)
    }
  }

  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Tu solicitud está siendo revisada por nuestro equipo. Te contactaremos pronto.'
      case 'approved':
        return 'Tu participación ha sido confirmada. Ya estás participando en el sorteo.'
      case 'rejected':
        return 'Tu solicitud fue rechazada. Contacta con soporte para más información.'
      default:
        return 'Estado no reconocido'
    }
  }

  return getStatusInfo()
}

// Хук для получения информации о результатах розыгрыша
export const useDrawResults = (verificationData: QRVerificationData | null) => {
  const getDrawInfo = () => {
    if (!verificationData) {
      return {
        hasResult: false,
        isWinner: false,
        resultText: 'Información del sorteo no disponible',
        resultColor: 'text-gray-400',
        drawStatus: 'unknown'
      }
    }

    const { is_winner, draw_status, draw_name } = verificationData
    
    return {
      hasResult: draw_status === 'finished',
      isWinner: is_winner,
      resultText: qrService.getWinnerText(is_winner, draw_status),
      resultColor: qrService.getWinnerColor(is_winner, draw_status),
      drawStatus: draw_status,
      drawName: draw_name
    }
  }

  return getDrawInfo()
}

// Хук для formatear datos de usuario
export const useUserDataFormatter = (verificationData: QRVerificationData | null) => {
  const formatUserData = () => {
    if (!verificationData) {
      return {
        name: 'N/A',
        phone: 'N/A',
        cedula: 'N/A',
        paymentMethod: 'N/A',
        numbers: 'N/A',
        createdAt: 'N/A'
      }
    }

    return {
      name: verificationData.user_name || 'N/A',
      phone: verificationData.user_phone || 'N/A',
      cedula: verificationData.cedula || 'N/A',
      paymentMethod: formatPaymentMethod(verificationData.payment_method),
      numbers: qrService.formatNumbers(verificationData.numbers),
      createdAt: qrService.formatDate(verificationData.created_at)
    }
  }

  const formatPaymentMethod = (method: string): string => {
    switch (method) {
      case 'pago-movil':
        return 'Pago Móvil'
      case 'binance':
        return 'Binance USDT'
      case 'bybit':
        return 'ByBit USDT'
      default:
        return method || 'N/A'
    }
  }

  return formatUserData()
}

// Хук для отслеживания изменений статуса в real-time
export const useRealtimeStatusUpdates = (applicationId?: string) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!applicationId) return

    // Настройка real-time подписки на изменения статуса заявки
    const handleStatusUpdate = () => {
      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['qr-verification'] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    }

    // В реальном проекте здесь была бы настройка Supabase realtime subscription
    // const subscription = supabase
    //   .channel('applications')
    //   .on('postgres_changes', {
    //     event: 'UPDATE',
    //     schema: 'public',
    //     table: 'applications',
    //     filter: `id=eq.${applicationId}`
    //   }, handleStatusUpdate)
    //   .subscribe()

    // return () => {
    //   subscription.unsubscribe()
    // }
  }, [applicationId, queryClient])
}

// Хук для валидации и обработки ошибок QR верификации
export const useQRValidation = () => {
  const validateQRData = (data: QRVerificationData | null, token: string | null) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!token) {
      errors.push('No se proporcionó un token de verificación')
      return { isValid: false, errors, warnings }
    }

    if (!qrService.isValidTokenFormat(token)) {
      errors.push('El formato del código QR no es válido')
      return { isValid: false, errors, warnings }
    }

    if (!data) {
      errors.push('No se encontró información para este código QR')
      return { isValid: false, errors, warnings }
    }

    // Verificaciones adicionales
    if (!data.user_name) warnings.push('Nombre de usuario no disponible')
    if (!data.numbers || data.numbers.length === 0) warnings.push('Números de participación no disponibles')
    if (!data.draw_name) warnings.push('Información del sorteo no disponible')

    // Verificar si el QR es muy antiguo (más de 6 meses)
    if (data.qr_generated_at) {
      const generatedDate = new Date(data.qr_generated_at)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      if (generatedDate < sixMonthsAgo) {
        warnings.push('Este código QR es muy antiguo. Algunos datos pueden no estar actualizados.')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  return { validateQRData }
} 