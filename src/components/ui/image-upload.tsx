import React, { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from './button'
import { useImageUpload } from '../../hooks/use-image-upload'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  label?: string
  className?: string
}

export function ImageUpload({ value, onChange, label, className = "" }: ImageUploadProps) {
  const { uploadImage, deleteImage, getPathFromUrl, isUploading } = useImageUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const result = await uploadImage(file, 'draws')
    
    if (result) {
      onChange(result.url)
    }
  }

  const handleRemove = async () => {
    if (!value) return

    const path = getPathFromUrl(value)
    const success = await deleteImage(path)
    
    if (success) {
      onChange('')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        {value ? (
          // Превью изображения - адаптивный контейнер
          <div className="relative group">
            <div className="relative w-full bg-gray-800/50 rounded-lg border border-gray-600 overflow-hidden">
              <img
                src={value}
                alt="Preview"
                className="w-full h-auto max-h-48 object-contain rounded-lg"
                style={{ minHeight: '120px' }}
                onError={(e) => {
                  console.error('Error loading image:', e)
                }}
              />
              {/* Overlay с кнопкой удаления */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Зона загрузки
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging 
                ? 'border-blue-400 bg-blue-50/10' 
                : 'border-gray-600 hover:border-gray-500'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                <p className="text-sm text-gray-400">Subiendo imagen...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                {isDragging ? (
                  <Upload className="h-8 w-8 text-blue-400" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                )}
                <div className="text-sm text-gray-400">
                  <span className="font-medium text-blue-400">Haz clic para subir</span>
                  <span> o arrastra una imagen aquí</span>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WEBP, GIF (máx. 5MB)
                </p>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={isUploading}
        />
      </div>
    </div>
  )
} 