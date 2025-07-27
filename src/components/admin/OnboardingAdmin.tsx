import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Save, RotateCcw, Monitor } from 'lucide-react'
import MediaUploader from './MediaUploader'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import { useOnboardingConfigAdmin, useUpdateOnboardingConfig } from '@/hooks/use-onboarding'
import { OnboardingConfig, UpdateOnboardingData } from '@/types/onboarding'
import { toast } from '@/hooks/use-toast'

const OnboardingAdmin: React.FC = () => {
  const { data: config, isLoading, refetch } = useOnboardingConfigAdmin()
  const updateConfig = useUpdateOnboardingConfig()
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [formData, setFormData] = useState<UpdateOnboardingData>({
    title: '',
    description: '',
    is_enabled: true,
    button_text: 'Continuar',
    show_on_every_visit: false,
    media_type: null,
    media_url: null,
    media_name: null,
  })
  const [hasChanges, setHasChanges] = useState(false)



  // Синхронизируем данные из БД с формой
  useEffect(() => {
    if (config && !hasChanges && !updateConfig.isPending) {
      setFormData({
        title: config.title,
        description: config.description,
        is_enabled: config.is_enabled,
        button_text: config.button_text,
        show_on_every_visit: config.show_on_every_visit,
        media_type: config.media_type,
        media_url: config.media_url,
        media_name: config.media_name,
      })
    }
  }, [config?.id, config?.title, config?.description, config?.updated_at, hasChanges, updateConfig.isPending])

  // Отдельный useEffect для обновления формы после успешного сохранения
  useEffect(() => {
    if (updateConfig.isSuccess && updateConfig.data && !hasChanges) {
      setFormData({
        title: updateConfig.data.title,
        description: updateConfig.data.description,
        is_enabled: updateConfig.data.is_enabled,
        button_text: updateConfig.data.button_text,
        show_on_every_visit: updateConfig.data.show_on_every_visit,
        media_type: updateConfig.data.media_type,
        media_url: updateConfig.data.media_url,
        media_name: updateConfig.data.media_name,
      })
    }
  }, [updateConfig.isSuccess, updateConfig.data, hasChanges])

  const handleInputChange = (field: keyof UpdateOnboardingData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleMediaUploaded = (url: string, type: 'image' | 'video', name: string) => {
    setFormData(prev => ({
      ...prev,
      media_url: url,
      media_type: type,
      media_name: name,
    }))
    setHasChanges(true)
  }

  const handleMediaRemoved = () => {
    setFormData(prev => ({
      ...prev,
      media_url: null,
      media_type: null,
      media_name: null,
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(formData)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving onboarding config:', error)
      toast({
        title: "Error",
        description: `Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      })
    }
  }

  const handleReset = () => {
    if (config) {
      setFormData({
        title: config.title,
        description: config.description,
        is_enabled: config.is_enabled,
        button_text: config.button_text,
        show_on_every_visit: config.show_on_every_visit,
        media_type: config.media_type,
        media_url: config.media_url,
        media_name: config.media_name,
      })
      setHasChanges(false)
    }
  }

  const getPreviewConfig = (): OnboardingConfig => ({
    id: config?.id || 'preview',
    title: formData.title || 'Título del Onboarding',
    description: formData.description || 'Descripción del onboarding',
    is_enabled: formData.is_enabled ?? true,
    button_text: formData.button_text || 'Continuar',
    show_on_every_visit: formData.show_on_every_visit ?? false,
    media_type: formData.media_type,
    media_url: formData.media_url,
    media_name: formData.media_name,
    created_at: config?.created_at || new Date().toISOString(),
    updated_at: config?.updated_at || new Date().toISOString(),
  })

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Configuración de Onboarding</h2>
          <p className="text-gray-400">Gestiona el contenido de bienvenida para nuevos usuarios</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {hasChanges && (
            <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg px-3 py-1">
              <p className="text-sm text-orange-200">⚠️ Hay cambios sin guardar</p>
            </div>
          )}
          
                     <div className="flex items-center gap-3">
             <Button
               onClick={() => setIsPreviewOpen(true)}
               variant="outline"
               size="sm"
               className="bg-white/10 border-gray-600 text-white hover:bg-white/20"
             >
               <Eye className="w-4 h-4 mr-2" />
               Vista Previa
             </Button>
            
            {hasChanges && (
              <>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Revertir
                </Button>
                
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={updateConfig.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateConfig.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <Card className="bg-white/5 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Configuración General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-200 font-medium">Estado del Onboarding</Label>
              <p className="text-sm text-gray-400">Activar o desactivar el onboarding</p>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => handleInputChange('is_enabled', checked)}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-200 font-medium">
              Título
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ej: Bienvenido al Sorteo de Suerte"
              className="bg-white/10 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200 font-medium">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe brevemente el sorteo y cómo participar..."
              rows={3}
              className="bg-white/10 border-gray-600 text-white placeholder-gray-400 resize-none"
            />
          </div>

          {/* Button Text */}
          <div className="space-y-2">
            <Label htmlFor="button_text" className="text-gray-200 font-medium">
              Texto del Botón
            </Label>
            <Input
              id="button_text"
              value={formData.button_text}
              onChange={(e) => handleInputChange('button_text', e.target.value)}
              placeholder="Continuar"
              className="bg-white/10 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Show Every Visit */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-200 font-medium">Mostrar en cada visita</Label>
              <p className="text-sm text-gray-400">Si está desactivado, solo se mostrará la primera vez</p>
            </div>
            <Switch
              checked={formData.show_on_every_visit}
              onCheckedChange={(checked) => handleInputChange('show_on_every_visit', checked)}
            />
          </div>

          {/* Media Upload */}
          <MediaUploader
            currentMediaUrl={formData.media_url}
            currentMediaType={formData.media_type}
            onMediaUploaded={handleMediaUploaded}
            onMediaRemoved={handleMediaRemoved}
          />
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <OnboardingModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        config={getPreviewConfig()}
      />

      {/* Status Indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Hay cambios sin guardar
        </div>
      )}
    </div>
  )
}

export default OnboardingAdmin 