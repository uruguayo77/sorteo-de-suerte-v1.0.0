import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from './use-toast'

export interface ImageUploadResult {
  url: string
  path: string
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false)

  // Загрузка изображения
  const uploadImage = async (file: File, folder = 'draws'): Promise<ImageUploadResult | null> => {
    try {
      setIsUploading(true)

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos de imagen",
          variant: "destructive"
        })
        return null
      }

      // Проверяем размер файла (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error", 
          description: "El archivo es demasiado grande. Máximo 5MB",
          variant: "destructive"
        })
        return null
      }

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Загружаем файл
      const { data, error } = await supabase.storage
        .from('lottery-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading image:', error)
        toast({
          title: "Error",
          description: "Error al subir la imagen: " + error.message,
          variant: "destructive"
        })
        return null
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('lottery-images')
        .getPublicUrl(data.path)

      return {
        url: urlData.publicUrl,
        path: data.path
      }

    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Error",
        description: "Error inesperado al subir la imagen",
        variant: "destructive"
      })
      return null
    } finally {
      setIsUploading(false)
    }
  }

  // Удаление изображения
  const deleteImage = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('lottery-images')
        .remove([path])

      if (error) {
        console.error('Error deleting image:', error)
        toast({
          title: "Error",
          description: "Error al eliminar la imagen: " + error.message,
          variant: "destructive"
        })
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting image:', error)
      toast({
        title: "Error", 
        description: "Error inesperado al eliminar la imagen",
        variant: "destructive"
      })
      return false
    }
  }

  // Получение URL из полного пути
  const getImageUrl = (path: string): string => {
    if (!path) return ''
    
    // Если это уже полный URL, возвращаем как есть
    if (path.startsWith('http')) return path
    
    // Иначе формируем URL через Supabase Storage
    const { data } = supabase.storage
      .from('lottery-images')
      .getPublicUrl(path)
    
    return data.publicUrl
  }

  // Извлечение пути из URL
  const getPathFromUrl = (url: string): string => {
    if (!url) return ''
    
    // Если это URL из Supabase Storage, извлекаем путь
    const match = url.match(/\/storage\/v1\/object\/public\/lottery-images\/(.+)$/)
    return match ? match[1] : url
  }

  return {
    uploadImage,
    deleteImage,
    getImageUrl,
    getPathFromUrl,
    isUploading
  }
} 