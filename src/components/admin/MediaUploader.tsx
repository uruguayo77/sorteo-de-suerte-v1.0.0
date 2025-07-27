import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, FileImage, Video, AlertCircle } from 'lucide-react'
import { useUploadOnboardingMedia } from '@/hooks/use-onboarding'
import { toast } from '@/hooks/use-toast'

interface MediaUploaderProps {
  currentMediaUrl?: string | null
  currentMediaType?: 'image' | 'video' | null
  onMediaUploaded: (url: string, type: 'image' | 'video', name: string) => void
  onMediaRemoved: () => void
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  currentMediaUrl,
  currentMediaType,
  onMediaUploaded,
  onMediaRemoved,
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMedia = useUploadOnboardingMedia()

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Проверяем тип файла
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen o video",
        variant: "destructive",
      })
      return
    }

    // Проверяем размер файла (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo es demasiado grande. Máximo 50MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const mediaUrl = await uploadMedia.mutateAsync(file)
      const mediaType = isImage ? 'image' : 'video'
      
      onMediaUploaded(mediaUrl, mediaType, file.name)
      toast({
        title: "Éxito",
        description: "Archivo subido exitosamente",
        variant: "default",
      })
    } catch (error) {
      console.error('Error uploading media:', error)
      toast({
        title: "Error",
        description: "Error al subir el archivo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveMedia = () => {
    onMediaRemoved()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-200">
        Contenido Multimedia (Imagen o Video)
      </Label>

      {/* Current Media Preview */}
      {currentMediaUrl && (
        <div className="relative">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {currentMediaType === 'video' ? (
                  <Video className="w-5 h-5 text-blue-400" />
                ) : (
                  <FileImage className="w-5 h-5 text-green-400" />
                )}
                <span className="text-sm text-gray-300">
                  {currentMediaType === 'video' ? 'Video actual' : 'Imagen actual'}
                </span>
              </div>
              <Button
                onClick={handleRemoveMedia}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

                         {/* Media Preview */}
             <div className="media-container min-h-[200px] max-h-[300px]">
               {currentMediaType === 'video' ? (
                 <video
                   src={currentMediaUrl}
                   controls
                 />
               ) : (
                 <img
                   src={currentMediaUrl}
                   alt="Current media"
                 />
               )}
             </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragOver
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-600 hover:border-gray-500'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <div className="text-center">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
              <p className="text-gray-400">Subiendo archivo...</p>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-gray-300 font-medium">
                  Arrastra tu archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-500">
                  Imágenes: JPG, PNG, WebP • Videos: MP4, WebM (máx. 50MB)
                </p>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {!isUploading && (
          <div className="mt-4 text-center">
            <Button
              onClick={openFileDialog}
              variant="outline"
              className="bg-white/10 border-gray-600 text-white hover:bg-white/20"
            >
              Seleccionar Archivo
            </Button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-200">
          <p className="font-medium mb-1">Recomendaciones:</p>
          <ul className="space-y-1 text-xs">
            <li>• Para imágenes: usar formato 16:9 (1920x1080px) para mejor visualización</li>
            <li>• Para videos: duración máxima recomendada 2-3 minutos</li>
            <li>• El contenido se mostrará automáticamente en el onboarding</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default MediaUploader 