import QRCode from 'qrcode'
import { supabase } from './supabase'

export interface QRVerificationData {
  id: string
  numbers: number[]
  user_name: string
  user_phone: string
  cedula: string
  payment_method: string
  payment_proof_url?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  created_at: string
  updated_at: string
  qr_generated_at?: string
  draw_name?: string
  draw_status?: string
  is_winner: boolean
  winner_number?: number
}

class QRService {
  private baseUrl: string

  constructor() {
    // URL base для проверки QR кодов
    this.baseUrl = window.location.origin
  }

  /**
   * Генерирует QR код для заявки
   */
  async generateQRCode(applicationId: string): Promise<string> {
    try {
      // Создаем QR токен в базе данных через RPC функцию
      const { data, error } = await supabase.rpc('create_qr_token_for_application', {
        application_id_input: applicationId
      })

      if (error) {
        console.error('Error creating QR token:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw new Error(`No se pudo crear el código QR: ${error.message || 'Error desconocido'}`)
      }

      const qrToken = data
      
      // URL для проверки QR с токеном
      const verificationUrl = `${this.baseUrl}/verificar?token=${qrToken}`
      
      // Генерируем QR код
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#1f2937', // Темный цвет для QR
          light: '#ffffff'  // Светлый фон
        },
        width: 256,
      })

      return qrCodeDataUrl
    } catch (error) {
      console.error('Error generating QR code:', error)
      throw new Error('No se pudo generar el código QR')
    }
  }

  /**
   * Проверяет QR токен и возвращает данные заявки
   */
  async verifyQRToken(token: string): Promise<QRVerificationData | null> {
    try {
      // Получаем данные заявки по QR токену через RPC функцию
      const { data, error } = await supabase.rpc('get_application_by_qr_token', {
        token_input: token
      })

      if (error) {
        console.error('Error verifying QR token:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw new Error(`Error al verificar el código QR: ${error.message || 'Error desconocido'}`)
      }

      if (!data || data.length === 0) {
        return null
      }

      const applicationData = data[0]

      // Логируем проверку QR кода
      await this.logQRVerification(applicationData.id, token)

      return applicationData
    } catch (error) {
      console.error('Error verifying QR token:', error)
      throw new Error('No se pudo verificar el código QR')
    }
  }

  /**
   * Логирует проверку QR кода
   */
  private async logQRVerification(applicationId: string, token: string): Promise<void> {
    try {
      // Получаем информацию о пользователе для логирования
      const userAgent = navigator.userAgent
      
      const { error } = await supabase.rpc('log_qr_verification', {
        application_id_input: applicationId,
        token_input: token,
        ip_input: null, // IP будет определен на сервере
        user_agent_input: userAgent
      })

      if (error) {
        console.error('Error logging QR verification:', error)
        // Не бросаем ошибку, так как это не критично
      }
    } catch (error) {
      console.error('Error logging QR verification:', error)
      // Не бросаем ошибку, так как это не критично
    }
  }

  /**
   * Извлекает токен из URL
   */
  extractTokenFromUrl(url?: string): string | null {
    const urlToCheck = url || window.location.href
    
    try {
      const urlObj = new URL(urlToCheck)
      return urlObj.searchParams.get('token')
    } catch (error) {
      console.error('Error extracting token from URL:', error)
      return null
    }
  }

  /**
   * Проверяет валидность токена (базовая проверка формата)
   */
  isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }

    // Проверяем что токен содержит алфавитно-цифровые символы, подчеркивание и дефисы
    const tokenRegex = /^[a-zA-Z0-9_-]+$/
    return tokenRegex.test(token) && token.length > 5 // Уменьшили минимальную длину
  }

  /**
   * Форматирует дату для отображения
   */
  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  /**
   * Получает текст статуса на испанском
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente de confirmación'
      case 'approved':
        return 'Confirmado y aprobado'
      case 'rejected':
        return 'Rechazado'
      default:
        return status
    }
  }

  /**
   * Получает цвет для статуса
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-400'
      case 'approved':
        return 'text-green-400'
      case 'rejected':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  /**
   * Получает иконку для статуса
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'approved':
        return '✅'
      case 'rejected':
        return '❌'
      default:
        return '❓'
    }
  }

  /**
   * Форматирует номера для отображения
   */
  formatNumbers(numbers: number[]): string {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return 'Sin números'
    }

    return numbers.sort((a, b) => a - b).join(', ')
  }

  /**
   * Получает текст результата розыгрыша
   */
  getWinnerText(isWinner: boolean, drawStatus?: string): string {
    if (drawStatus !== 'finished') {
      return 'El sorteo aún no ha finalizado'
    }

    if (isWinner) {
      return '🏆 ¡Felicidades! Eres el ganador de este sorteo'
    } else {
      return '😔 Tu billete no resultó ganador esta vez. ¡Mejor suerte la próxima!'
    }
  }

  /**
   * Получает цвет для результата розыгрыша
   */
  getWinnerColor(isWinner: boolean, drawStatus?: string): string {
    if (drawStatus !== 'finished') {
      return 'text-blue-400'
    }

    return isWinner ? 'text-green-400' : 'text-gray-400'
  }
}

// Экспортируем единственный экземпляр сервиса
export const qrService = new QRService() 