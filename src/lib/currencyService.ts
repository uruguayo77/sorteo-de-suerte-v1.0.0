import { supabase } from './supabase'

// Интерфейс для ответа API ve.dolarapi.com
interface DolarApiResponse {
  fuente: string
  nombre: string
  compra: number | null
  venta: number | null
  promedio: number
  fechaActualizacion: string
}

// Интерфейс для настроек валют
export interface CurrencySettings {
  id: string
  currency_code: string
  currency_name: string
  symbol: string
  usd_rate: number
  is_active: boolean
  last_updated: string
  api_source: string | null
  created_at: string
  updated_at: string
}

// Интерфейс для конвертации валют
export interface CurrencyConversion {
  amount: number
  fromCurrency: string
  toCurrency: string
  result: number
  rate: number
}

class CurrencyService {
  private readonly DOLAR_API_URL = 'https://ve.dolarapi.com/v1/dolares/paralelo'
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 минут в миллисекундах
  private lastFetchTime: number = 0
  private cachedRate: number | null = null

  /**
   * Получает актуальный курс доллара с API ve.dolarapi.com
   */
  async fetchDollarRate(): Promise<number> {
    try {
      const now = Date.now()
      
      // Используем кеш если данные свежие
      if (this.cachedRate && (now - this.lastFetchTime) < this.CACHE_DURATION) {
        return this.cachedRate
      }

      console.log('Получаем курс доллара с ve.dolarapi.com...')
      
      const response = await fetch(this.DOLAR_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LotteryApp/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: DolarApiResponse = await response.json()
      
      if (!data.promedio || data.promedio <= 0) {
        throw new Error('Invalid rate data from API')
      }

      this.cachedRate = data.promedio
      this.lastFetchTime = now

      console.log(`Получен курс: 1 USD = ${data.promedio} Bs (${data.fechaActualizacion})`)
      
      return data.promedio
    } catch (error) {
      console.error('Ошибка при получении курса доллара:', error)
      
      // Возвращаем последний кешированный курс или дефолтный
      if (this.cachedRate) {
        console.log('Используем кешированный курс:', this.cachedRate)
        return this.cachedRate
      }
      
      // Фallback курс
      console.log('Используем резервный курс: 162.95')
      return 162.95
    }
  }

  /**
   * Обновляет курс в базе данных
   */
  async updateRateInDatabase(rate: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('update_currency_rate', {
          p_currency_code: 'VES',
          p_new_rate: rate,
          p_api_source: this.DOLAR_API_URL
        })

      if (error) throw error

      console.log('Курс успешно обновлен в базе данных:', rate)
      return data === true
    } catch (error) {
      console.error('Ошибка при обновлении курса в БД:', error)
      return false
    }
  }

  /**
   * Получает и обновляет курс доллара
   */
  async updateDollarRate(): Promise<{ success: boolean; rate?: number; error?: string }> {
    try {
      const rate = await this.fetchDollarRate()
      const updated = await this.updateRateInDatabase(rate)
      
      if (updated) {
        return { success: true, rate }
      } else {
        return { success: false, error: 'Не удалось обновить курс в базе данных' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }
    }
  }

  /**
   * Получает настройки валют из базы данных
   */
  async getCurrencySettings(): Promise<CurrencySettings[]> {
    try {
      const { data, error } = await supabase
        .from('currency_settings')
        .select('*')
        .eq('is_active', true)
        .order('currency_code')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Ошибка при получении настроек валют:', error)
      return []
    }
  }

  /**
   * Получает текущий курс валюты
   */
  async getCurrentRate(currencyCode: string = 'VES'): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_current_rate', { p_currency_code: currencyCode })

      if (error) throw error

      return data || 1.0
    } catch (error) {
      console.error('Ошибка при получении курса:', error)
      return 1.0
    }
  }

  /**
   * Конвертирует валюты
   */
  async convertCurrency(
    amount: number, 
    fromCurrency: string = 'USD', 
    toCurrency: string = 'VES'
  ): Promise<CurrencyConversion> {
    try {
      const { data, error } = await supabase
        .rpc('convert_currency', {
          p_amount: amount,
          p_from_currency: fromCurrency,
          p_to_currency: toCurrency
        })

      if (error) throw error

      const rate = fromCurrency === 'USD' 
        ? await this.getCurrentRate(toCurrency)
        : 1 / await this.getCurrentRate(fromCurrency)

      return {
        amount,
        fromCurrency,
        toCurrency,
        result: data || amount,
        rate
      }
    } catch (error) {
      console.error('Ошибка при конвертации валют:', error)
      return {
        amount,
        fromCurrency,
        toCurrency,
        result: amount,
        rate: 1
      }
    }
  }

  /**
   * Форматирует сумму в валюте
   */
  formatCurrency(amount: number, currencyCode: string = 'VES'): string {
    const formatted = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)

    switch (currencyCode) {
      case 'VES':
        return `${formatted} Bs`
      case 'USD':
        return `$${formatted}`
      default:
        return `${formatted} ${currencyCode}`
    }
  }

  /**
   * Получает статистику по валютам
   */
  async getCurrencyStats() {
    try {
      const { data, error } = await supabase
        .rpc('get_currency_stats')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Ошибка при получении статистики валют:', error)
      return []
    }
  }

  /**
   * Проверяет, нужно ли обновить курс (если последнее обновление было больше часа назад)
   */
  async shouldUpdateRate(): Promise<boolean> {
    try {
      const settings = await this.getCurrencySettings()
      const vesSettings = settings.find(s => s.currency_code === 'VES')
      
      if (!vesSettings) return true

      const lastUpdate = new Date(vesSettings.last_updated)
      const now = new Date()
      const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

      return hoursDiff >= 1 // Обновляем если прошло больше часа
    } catch (error) {
      console.error('Ошибка при проверке необходимости обновления курса:', error)
      return true
    }
  }
}

// Экспортируем синглтон
export const currencyService = new CurrencyService()

// Утилитарные функции для быстрого доступа
export const updateDollarRate = () => currencyService.updateDollarRate()
export const getCurrentRate = (currencyCode?: string) => currencyService.getCurrentRate(currencyCode)
export const convertCurrency = (amount: number, from?: string, to?: string) => 
  currencyService.convertCurrency(amount, from, to)
export const formatCurrency = (amount: number, currencyCode?: string) => 
  currencyService.formatCurrency(amount, currencyCode) 