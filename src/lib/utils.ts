import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Преобразует дату в формат для input[type="datetime-local"]
 */
export function formatDateTimeLocal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Расчитывает продолжительность между двумя датами в минутах
 */
export function calculateDurationMinutes(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60)) // Конвертируем в минуты
}

/**
 * Добавляет минуты к дате
 */
export function addMinutesToDate(date: string | Date, minutes: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getTime() + minutes * 60 * 1000)
}

/**
 * Форматирует продолжительность в читабельный вид
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} ч`
  }
  
  return `${hours} ч ${remainingMinutes} мин`
}

/**
 * Валидация времени окончания (должно быть больше времени начала)
 */
export function validateEndTime(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return end > start
}
