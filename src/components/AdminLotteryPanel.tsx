import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/ui/image-upload'
import { ImageGallery } from '@/components/ui/image-gallery'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  useLotteryDraws, 
  useCreateLotteryDraw, 
  useUpdateLotteryDraw,
  useDeleteLotteryDraw
} from '@/hooks/use-supabase'
import { useDrawCountdown, formatCountdown } from '@/hooks/use-scheduled-draws'
import { useAutoUpdateCurrency, useCurrencyInfo, usePriceCalculator } from '@/hooks/use-currency'
import { MigrationStatus } from '@/components/ui/migration-status'
import ActiveLotteryStats from '@/components/ActiveLotteryStats'
import { 
  LotteryDraw, 
  CreateLotteryDrawData
} from '@/lib/supabase'
import {
  formatDateTimeLocal,
  calculateDurationMinutes,
  addMinutesToDate,
  formatDuration,
  validateEndTime
} from '@/lib/utils'
import { 
  Plus, 
  Trophy, 
  Calendar, 
  Clock, 
  Gift, 
  Image as ImageIcon,
  User, 
  Hash, 
  Edit,
  X,
  Search,
  Filter,
  RotateCcw,
  Trash2
} from 'lucide-react'

export function AdminLotteryPanel() {
  const [isCreateDrawOpen, setIsCreateDrawOpen] = useState(false)
  const [isEditDrawOpen, setIsEditDrawOpen] = useState(false)
  const [selectedDraw, setSelectedDraw] = useState<LotteryDraw | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryStartIndex, setGalleryStartIndex] = useState(0)
  
  const [newDraw, setNewDraw] = useState<CreateLotteryDrawData>({
    draw_name: '',
    end_date: '',
    duration_minutes: 60, // Por defecto 1 hora
    prize_description: '',
    prize_image_1: '',
    prize_image_2: '',
    prize_image_3: '',
    // scheduled_start_time: '', // Temporalmente deshabilitado
    number_price_usd: 1.00,
    number_price_bs: 162.95
    // created_by removido - se asignará automáticamente en la BD
  })

  const [editDraw, setEditDraw] = useState<CreateLotteryDrawData>({
    draw_name: '',
    end_date: '',
    duration_minutes: 60, // Por defecto 1 hora
    prize_description: '',
    prize_image_1: '',
    prize_image_2: '',
    prize_image_3: '',
    number_price_usd: 1.00,
    number_price_bs: 162.95
  })
  
  const [enableDelayedStart, setEnableDelayedStart] = useState(false)
  const [primaryCurrency, setPrimaryCurrency] = useState<'USD' | 'VES'>('USD')

  // Opciones predefinidas de duración
  const quickDurationOptions = [
    { label: '1 hora', minutes: 60, category: 'hours' },
    { label: '2 horas', minutes: 120, category: 'hours' },
    { label: '6 horas', minutes: 360, category: 'hours' },
    { label: '12 horas', minutes: 720, category: 'hours' },
    { label: '1 día', minutes: 1440, category: 'days' },
    { label: '2 días', minutes: 2880, category: 'days' },
    { label: '3 días', minutes: 4320, category: 'days' },
    { label: '1 semana', minutes: 10080, category: 'weeks' },
    { label: '2 semanas', minutes: 20160, category: 'weeks' },
    { label: '1 mes', minutes: 43200, category: 'months' }
  ]

  // Hooks para trabajar con monedas
  useAutoUpdateCurrency() // Actualización automática de tipo de cambio
  const { rateDisplay, currentRate, isStale } = useCurrencyInfo()
  const { calculatePrices, formatPrices } = usePriceCalculator()

  // Actualizar precios al cambiar el tipo de cambio o precio base
  const updatePrices = (value: number, currency: 'USD' | 'VES') => {
    if (!currentRate) return

    const prices = calculatePrices(value, currency)
    setNewDraw(prev => ({
      ...prev,
      number_price_usd: prices.usd,
      number_price_bs: prices.bs,
      usd_to_bs_rate: currentRate
    }))
  }

  // Función para actualizar la fecha de finalización basada en duración desde ahora
  const updateEndDateFromDuration = (durationMinutes: number) => {
    if (!durationMinutes) return

    const now = new Date()
    const endDate = addMinutesToDate(now, durationMinutes)
    setNewDraw(prev => ({
      ...prev,
      end_date: formatDateTimeLocal(endDate)
    }))
  }

  // Función para actualizar la duración basada en fecha de finalización desde ahora
  const updateDurationFromDates = (endDate: string) => {
    if (!endDate) return

    const now = new Date()
    if (!validateEndTime(now, endDate)) {
      toast.error('La fecha de finalización debe ser mayor que la fecha actual')
      return
    }

    const duration = calculateDurationMinutes(now, endDate)
    setNewDraw(prev => ({
      ...prev,
      duration_minutes: duration
    }))
  }

  // Manejador de cambio de fecha de finalización en formulario de creación
  const handleEndDateChange = (newEndDate: string) => {
    setNewDraw(prev => ({
      ...prev,
      end_date: newEndDate
    }))

    // Actualizar automáticamente la duración desde ahora
    if (newEndDate) {
      updateDurationFromDates(newEndDate)
    }
  }

  // Manejador de cambio de duración en formulario de creación
  const handleDurationChange = (newDuration: number) => {
    setNewDraw(prev => ({
      ...prev,
      duration_minutes: newDuration
    }))

    // Actualizar automáticamente la fecha de fin desde ahora
    if (newDuration > 0) {
      updateEndDateFromDuration(newDuration)
    }
  }

  // Selección rápida de duración para formulario de creación
  const handleQuickDurationSelect = (minutes: number) => {
    handleDurationChange(minutes)
  }

  // Funciones similares para formulario de edición
  const updateEditEndDateFromDuration = (startDate: string, durationMinutes: number) => {
    if (!startDate || !durationMinutes) return

    const endDate = addMinutesToDate(startDate, durationMinutes)
    setEditDraw(prev => ({
      ...prev,
      end_date: formatDateTimeLocal(endDate)
    }))
  }

  const updateEditDurationFromDates = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return

    if (!validateEndTime(startDate, endDate)) {
      toast.error('La fecha de finalización debe ser mayor que la fecha de inicio')
      return
    }

    const duration = calculateDurationMinutes(startDate, endDate)
    setEditDraw(prev => ({
      ...prev,
      duration_minutes: duration
    }))
  }

  const handleEditEndDateChange = (newEndDate: string) => {
    setEditDraw(prev => ({
      ...prev,
      end_date: newEndDate
    }))

    if (editDraw.draw_date && newEndDate) {
      updateEditDurationFromDates(editDraw.draw_date, newEndDate)
    }
  }

  const handleEditDurationChange = (newDuration: number) => {
    setEditDraw(prev => ({
      ...prev,
      duration_minutes: newDuration
    }))

    if (editDraw.draw_date && newDuration > 0) {
      updateEditEndDateFromDuration(editDraw.draw_date, newDuration)
    }
  }

  // Selección rápida de duración para formulario de edición
  const handleEditQuickDurationSelect = (minutes: number) => {
    handleEditDurationChange(minutes)
  }

  // Efecto para sincronización automática de precios al cambiar el tipo de cambio
  useEffect(() => {
    if (currentRate && newDraw.number_price_usd) {
      // Siempre recalcular bolívares basándose en USD y tipo de cambio actual
      const calculatedBs = newDraw.number_price_usd * currentRate
      if (Math.abs(calculatedBs - (newDraw.number_price_bs || 0)) > 0.01) {
        setNewDraw(prev => ({
          ...prev,
          number_price_bs: Math.round(calculatedBs * 100) / 100,
          usd_to_bs_rate: currentRate
        }))
      }
    }
  }, [currentRate, newDraw.number_price_usd])

  // Efecto para sincronización automática de precios en formulario de edición
  useEffect(() => {
    if (currentRate && editDraw.number_price_usd && isEditDrawOpen) {
      const calculatedBs = editDraw.number_price_usd * currentRate
      if (Math.abs(calculatedBs - (editDraw.number_price_bs || 0)) > 0.01) {
        setEditDraw(prev => ({
          ...prev,
          number_price_bs: Math.round(calculatedBs * 100) / 100,
          usd_to_bs_rate: currentRate
        }))
      }
    }
  }, [currentRate, editDraw.number_price_usd, isEditDrawOpen])

  // Componente para mostrar el temporizador de cuenta regresiva
  const DrawCountdownTimer = ({ draw }: { draw: LotteryDraw }) => {
    // Temporalmente deshabilitado - requiere migración add_scheduled_start_time.sql
    return null
    
    // const countdown = useDrawCountdown(draw.scheduled_start_time)
    
    // if (!draw.scheduled_start_time || draw.status !== 'scheduled') {
    //   return null
    // }
    
    // if (!countdown) {
    //   return (
    //     <div className="text-xs text-green-300 font-medium">
    //       ⚡ Iniciando ahora...
    //     </div>
    //   )
    // }
    
    // return (
    //   <div className="flex items-center gap-2 text-xs">
    //     <span className="text-orange-300">⏱️</span>
    //     <span className="text-orange-300 font-mono font-medium">
    //       {formatCountdown(countdown)}
    //     </span>
    //     <span className="text-gray-400">hasta el inicio</span>
    //   </div>
    // )
  }

  // Hooks reales para datos
  const { data: allDraws, isLoading, error } = useLotteryDraws()
  const createDrawMutation = useCreateLotteryDraw()
  const updateDrawMutation = useUpdateLotteryDraw()
  const deleteDrawMutation = useDeleteLotteryDraw()

  // Función para eliminar sorteo
  const handleDeleteDraw = async (draw: LotteryDraw) => {
    // Confirmación de eliminación
    if (!confirm(`¿Estás seguro de que quieres eliminar el sorteo "${draw.draw_name}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    try {
      await deleteDrawMutation.mutateAsync(draw.id)
      toast.success('Sorteo eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting draw:', error)
      toast.error('Error al eliminar el sorteo')
    }
  }

  // Función para abrir diálogo de edición
  const handleEditDraw = (draw: LotteryDraw) => {
    // Formatear fecha para input[type="datetime-local"] considerando hora local
    const date = new Date(draw.draw_date)
    // Obtener hora local considerando zona horaria
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    const formattedDate = localDate.toISOString().slice(0, 16)
    
    // Formatear fecha de finalización, si existe
    let formattedEndDate = ''
    if (draw.end_date) {
      const endDate = new Date(draw.end_date)
      const localEndDate = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000)
      formattedEndDate = localEndDate.toISOString().slice(0, 16)
    }
    
    setEditDraw({
      draw_name: draw.draw_name,
      draw_date: formattedDate,
      end_date: formattedEndDate,
      duration_minutes: draw.duration_minutes || 60,
      prize_description: draw.prize_description,
      prize_image_1: draw.prize_image_1 || '',
      prize_image_2: draw.prize_image_2 || '',
      prize_image_3: draw.prize_image_3 || '',
      number_price_usd: draw.number_price_usd,
      number_price_bs: draw.number_price_bs,
      usd_to_bs_rate: draw.usd_to_bs_rate
    })
    
    setSelectedDraw(draw)
    setIsEditDrawOpen(true)
  }

  // Función para actualizar precios en formulario de edición
  const updateEditPrices = (value: number, currency: 'USD' | 'VES') => {
    if (!currentRate) return

    const prices = calculatePrices(value, currency)
    setEditDraw(prev => ({
      ...prev,
      number_price_usd: prices.usd,
      number_price_bs: prices.bs,
      usd_to_bs_rate: currentRate
    }))
  }

  // Función para guardar cambios
  const handleUpdateDraw = async () => {
    if (!selectedDraw) return

    try {
      // Preparar datos para actualización
      const updateData = {
        draw_name: editDraw.draw_name,
        draw_date: editDraw.draw_date,
        end_date: editDraw.end_date || null,
        duration_minutes: editDraw.duration_minutes || null,
        prize_description: editDraw.prize_description,
        prize_image_1: editDraw.prize_image_1 || null,
        prize_image_2: editDraw.prize_image_2 || null,
        prize_image_3: editDraw.prize_image_3 || null,
        number_price_usd: editDraw.number_price_usd,
        number_price_bs: editDraw.number_price_bs,
        usd_to_bs_rate: editDraw.usd_to_bs_rate || currentRate
      }

      await updateDrawMutation.mutateAsync({
        drawId: selectedDraw.id,
        updateData
      })

      toast.success('Sorteo actualizado exitosamente')
      setIsEditDrawOpen(false)
      setSelectedDraw(null)
    } catch (error) {
      console.error('Error updating draw:', error)
      toast.error('Error al actualizar el sorteo')
    }
  }

  // Filtración de sorteos activos y completados
  const activeDraws = allDraws?.filter(draw => 
    draw.status === 'scheduled' || draw.status === 'active'
  ) || []

  const completedDraws = allDraws?.filter(draw => 
    draw.status === 'finished' || draw.status === 'cancelled'
  ) || []

  // Filtración para historial con búsqueda
  const filteredHistory = completedDraws.filter(draw => {
    const matchesSearch = draw.draw_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || draw.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreateDraw = async () => {
    try {
      // Preparar datos para creación
      const drawData: CreateLotteryDrawData = {
        draw_name: newDraw.draw_name, // El número se agregará automáticamente en la BD
        draw_date: undefined, // Será establecido por el servidor con valor por defecto NOW()
        end_date: newDraw.end_date || undefined,
        duration_minutes: newDraw.duration_minutes || undefined,
        prize_description: newDraw.prize_description,
        prize_image_1: newDraw.prize_image_1,
        prize_image_2: newDraw.prize_image_2,
        prize_image_3: newDraw.prize_image_3,
        number_price_usd: newDraw.number_price_usd,
        number_price_bs: newDraw.number_price_bs,
        // Temporalmente deshabilitado - requiere migración add_scheduled_start_time.sql
        // scheduled_start_time: enableDelayedStart ? newDraw.scheduled_start_time : undefined
      }
      
      await createDrawMutation.mutateAsync(drawData)
      
      const message = 'Sorteo creado exitosamente'
      
      toast.success(message)
      setIsCreateDrawOpen(false)
      setNewDraw({
        draw_name: '',
        end_date: '',
        duration_minutes: 60,
        prize_description: '',
        prize_image_1: '',
        prize_image_2: '',
        prize_image_3: '',
        // scheduled_start_time: '', // Temporalmente deshabilitado
        number_price_usd: 1.00,
        number_price_bs: 162.95
      })
      // setEnableDelayedStart(false) // Temporalmente deshabilitado
    } catch (error) {
      toast.error('Error al crear el sorteo')
      console.error(error)
    }
  }

  const handleUpdateDrawStatus = async (drawId: string, newStatus: LotteryDraw['status']) => {
    try {
      await updateDrawMutation.mutateAsync({
        drawId,
        updateData: { status: newStatus }
      })
      toast.success('Estado del sorteo actualizado')
    } catch (error) {
      toast.error('Error al actualizar el estado')
      console.error(error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'finished':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'finished':
        return 'Finalizado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const openImageGallery = (images: string[], startIndex = 0) => {
    const validImages = images.filter(Boolean)
    if (validImages.length > 0) {
      setGalleryImages(validImages)
      setGalleryStartIndex(startIndex)
      setIsGalleryOpen(true)
    }
  }

  const extractDrawNumber = (drawName: string) => {
    const match = drawName.match(/^#(\d+)/)
    return match ? match[1] : 'N/A'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando sorteos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error al cargar sorteos</p>
          <p className="text-gray-400">Por favor, recarga la página</p>
        </div>
      </div>
    )
  }

      return (
      <div className="space-y-8">
        {/* Estado de migraciones */}
        <MigrationStatus />
        
        <Tabs defaultValue="active" className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
              Gestión de Sorteos
            </h2>
            <p className="text-gray-300 mt-1">Crear y administrar sorteos de la lotería</p>
          </div>
          
                     <Button
             onClick={() => setIsCreateDrawOpen(true)}
             className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 flex items-center gap-2 shadow-xl hover:scale-105 transition-all duration-200 py-3 px-6 font-semibold rounded-xl"
           >
             <Plus className="w-4 h-4" />
             Nuevo Sorteo
           </Button>
        </div>

        <TabsList className="flex w-full overflow-x-auto scrollbar-hide bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-1 gap-1 min-w-0">
          <TabsTrigger 
            value="active" 
            className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-300 hover:text-white transition-all duration-200 rounded-xl font-medium text-sm px-4 py-2 whitespace-nowrap"
          >
            Sorteos Activos
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-300 hover:text-white transition-all duration-200 rounded-xl font-medium text-sm px-4 py-2 whitespace-nowrap"
          >
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Sorteos Activos */}
        <TabsContent value="active" className="space-y-6">
          {/* Estadísticas del sorteo activo */}
          <ActiveLotteryStats />
          
          <div className="grid gap-6">
            {activeDraws.length > 0 ? (
              activeDraws.map((draw) => (
                <motion.div
                  key={draw.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:bg-white/15 transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left side - Draw info */}
                    <div className="flex-1 space-y-4">
                      {/* Header with status and date */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-600 text-white px-2 py-1 rounded font-bold text-sm">
                            #{extractDrawNumber(draw.draw_name)}
                          </span>
                          <h3 className="text-xl font-bold text-white">{draw.draw_name}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(draw.status)}`}>
                          <Clock className="w-4 h-4 inline mr-1" />
                          {getStatusText(draw.status)}
                        </span>
                        <span className="text-gray-400 text-sm">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {formatDate(draw.draw_date)}
                        </span>
                      </div>

                      {/* Tiempo de duración del sorteo */}
                      {(draw.end_date || draw.duration_minutes) && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {draw.end_date && (
                              <span className="text-blue-300 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Finaliza: {formatDate(draw.end_date)}
                              </span>
                            )}
                            {draw.duration_minutes && (
                              <span className="text-blue-300 flex items-center gap-1">
                                ⏱️ Duración: {formatDuration(draw.duration_minutes)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Prize Description */}
                      <div className="flex items-start gap-2">
                        <Gift className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                          <span className="text-white font-medium">Premio:</span>
                          <p className="text-gray-300 mt-1">{draw.prize_description}</p>
                        </div>
                      </div>

                      {/* Prize Images */}
                      {(draw.prize_image_1 || draw.prize_image_2 || draw.prize_image_3) && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Imágenes del premio:</span>
                          </div>
                          <div className="flex gap-3">
                            {[draw.prize_image_1, draw.prize_image_2, draw.prize_image_3]
                              .filter(Boolean)
                              .map((imageUrl, index) => (
                                <button
                                  key={index}
                                  onClick={() => openImageGallery([draw.prize_image_1, draw.prize_image_2, draw.prize_image_3], index)}
                                  className="group relative"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`Premio imagen ${index + 1}`}
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-600 group-hover:border-purple-400 transition-colors"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs">Ver</span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Winner info */}
                      {draw.winner_number && draw.winner_name && (
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-300">
                            <Trophy className="w-4 h-4" />
                            <span className="font-medium">Ganador:</span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-green-300">
                              <Hash className="w-4 h-4" />
                              <span>Número: #{draw.winner_number}</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-300">
                              <User className="w-4 h-4" />
                              <span>{draw.winner_name}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:w-48">
                      {/* El administrador puede editar sorteos en cualquier estado */}
                                             <Button
                         onClick={() => handleEditDraw(draw)}
                         className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 flex items-center gap-2 shadow-lg hover:scale-105 transition-all duration-200 font-medium rounded-xl"
                       >
                         <Edit className="w-4 w-4" />
                         Editar
                       </Button>
                      
                      {/* Botón de eliminación solo para sorteos no iniciados */}
                      {draw.status === 'scheduled' && (
                                                 <Button
                           onClick={() => handleDeleteDraw(draw)}
                           className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 flex items-center gap-2 shadow-lg hover:scale-105 transition-all duration-200 font-medium rounded-xl"
                           disabled={deleteDrawMutation.isPending}
                         >
                           <Trash2 className="w-4 h-4" />
                           {deleteDrawMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                         </Button>
                      )}
                      
                      <div className="lg:w-full">
                        <Label className="text-gray-300 text-sm">Estado:</Label>
                        <Select 
                          value={draw.status} 
                          onValueChange={(value) => handleUpdateDrawStatus(draw.id, value as LotteryDraw['status'])}
                        >
                          <SelectTrigger className="bg-white/5 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="finished">Finalizado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 max-w-md mx-auto">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 text-lg mb-2">No hay sorteos activos</p>
                  <p className="text-gray-400 text-sm">Crea tu primer sorteo para comenzar</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Historial de Sorteos */}
        <TabsContent value="history" className="space-y-6">
          {/* Filtros de búsqueda */}
          <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-white text-sm mb-2 block">Buscar por nombre</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar sorteo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400 pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Label className="text-white text-sm mb-2 block">Filtrar por estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white/5 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="finished">Finalizados</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:w-auto">
                <Label className="text-white text-sm mb-2 block">&nbsp;</Label>
                                 <Button
                   onClick={clearFilters}
                   className="bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 flex items-center gap-2 transition-all duration-200 font-medium rounded-xl"
                 >
                   <RotateCcw className="w-4 h-4" />
                   Limpiar
                 </Button>
              </div>
            </div>
          </div>

          {/* Lista de historial */}
          <div className="grid gap-4">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((draw) => (
                <motion.div
                  key={draw.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:bg-white/10 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-gray-600 text-white px-2 py-1 rounded font-bold text-xs">
                          #{extractDrawNumber(draw.draw_name)}
                        </span>
                        <h4 className="text-white font-medium">{draw.draw_name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(draw.status)}`}>
                          {getStatusText(draw.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(draw.draw_date)}
                        </span>
                        {draw.end_date && (
                          <span className="flex items-center gap-1 text-blue-300">
                            <Clock className="w-3 h-3" />
                            Finalizado: {formatDate(draw.end_date)}
                          </span>
                        )}
                        {draw.duration_minutes && (
                          <span className="flex items-center gap-1 text-blue-300">
                            ⏱️ {formatDuration(draw.duration_minutes)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          {draw.prize_description}
                        </span>
                        {draw.winner_number && (
                          <span className="flex items-center gap-1 text-green-400">
                            <Trophy className="w-3 h-3" />
                            Ganador: #{draw.winner_number}
                          </span>
                        )}
                      </div>
                      
                      {/* Temporizador para inicio programado en historial */}
                      <DrawCountdownTimer draw={draw} />
                    </div>
                    
                    {/* Actions for history items */}
                    <div className="flex gap-2">
                                             <Button
                         onClick={() => handleEditDraw(draw)}
                         size="sm"
                         className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 flex items-center gap-2 shadow-md hover:scale-105 transition-all duration-200 font-medium rounded-xl"
                       >
                         <Edit className="w-3 h-3" />
                         Editar
                       </Button>
                      
                      {/* Botón de eliminación solo para sorteos no iniciados */}
                      {draw.status === 'scheduled' && (
                                                 <Button
                           onClick={() => handleDeleteDraw(draw)}
                           size="sm"
                           className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 flex items-center gap-2 shadow-md hover:scale-105 transition-all duration-200 font-medium rounded-xl"
                           disabled={deleteDrawMutation.isPending}
                         >
                           <Trash2 className="w-3 h-3" />
                           Eliminar
                         </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 max-w-md mx-auto">
                  <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 text-lg mb-2">No se encontraron sorteos</p>
                  <p className="text-gray-400 text-sm">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Intenta cambiar los filtros de búsqueda'
                      : 'No hay sorteos completados aún'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Draw Modal */}
      <AnimatePresence>
        {isCreateDrawOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsCreateDrawOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Crear Nuevo Sorteo</h3>
                                 <Button
                   onClick={() => setIsCreateDrawOpen(false)}
                   size="sm"
                   className="text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                 >
                   <X className="w-4 h-4" />
                 </Button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCreateDraw(); }} className="space-y-6">
                <div>
                  <Label htmlFor="draw_name" className="text-white">Nombre del Sorteo</Label>
                  <Input
                    id="draw_name"
                    value={newDraw.draw_name}
                    onChange={(e) => setNewDraw({ ...newDraw, draw_name: e.target.value })}
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="Ej: Sorteo de Navidad 2024"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Se asignará automáticamente un número de sorteo</p>
                </div>

                {/* Configuración de tiempo del sorteo */}
                <div className="bg-white/5 border border-gray-600 rounded-lg p-4">
                  <Label className="text-white font-medium mb-4 block">⏱️ Duración del Sorteo</Label>
                  
                                     {/* Botones de selección rápida */}
                   <div className="mb-6">
                     <Label className="text-white text-sm mb-3 block">⚡ Selección rápida:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {quickDurationOptions.map((option) => (
                        <Button
                          key={option.label}
                          type="button"
                          onClick={() => handleQuickDurationSelect(option.minutes)}
                          className={`text-xs py-2 px-3 transition-all duration-200 ${
                            newDraw.duration_minutes === option.minutes
                              ? 'bg-purple-500 hover:bg-purple-600 text-white border-purple-400'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="end_date" className="text-white">Fecha y Hora de Finalización</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={newDraw.end_date}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="bg-white/5 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Opcional - se calculará automáticamente</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="duration_minutes" className="text-white">Duración (minutos)</Label>
                      <Input
                        id="duration_minutes"
                        type="number"
                        min="1"
                        step="1"
                        value={newDraw.duration_minutes || ''}
                        onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                        className="bg-white/5 border-gray-600 text-white"
                        placeholder="60"
                      />
                      <p className="text-xs text-gray-400 mt-1">Por defecto: 60 minutos</p>
                    </div>
                    
                    <div className="flex items-end">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 w-full">
                        <div className="text-blue-300 text-sm font-medium mb-1">Duración calculada:</div>
                        <div className="text-blue-200 text-lg font-mono">
                          {newDraw.duration_minutes ? formatDuration(newDraw.duration_minutes) : '--'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                    <span className="font-medium">💡 Consejo:</span> Puedes establecer la duración en minutos o la fecha de finalización. Los campos se actualizarán automáticamente.
                  </div>
                </div>

                 {/* Configuración de precio por número */}
                 <div className="bg-white/5 border border-gray-600 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-4">
                     <Label className="text-white font-medium">💰 Precio por número</Label>
                     <div className="flex items-center gap-2 text-xs">
                       <span className={`px-2 py-1 rounded ${isStale ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                         {rateDisplay}
                       </span>
                       {isStale && <span className="text-yellow-400">⚠️ Desactualizado</span>}
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="price_usd" className="text-white flex items-center gap-2">
                         💵 Precio en Dólares (USD)
                         <input
                           type="radio"
                           checked={primaryCurrency === 'USD'}
                           onChange={() => setPrimaryCurrency('USD')}
                           className="w-3 h-3"
                         />
                       </Label>
                       <Input
                         id="price_usd"
                         type="number"
                         step="0.01"
                         min="0.01"
                         value={newDraw.number_price_usd || ''}
                         onChange={(e) => {
                           const value = parseFloat(e.target.value) || 0
                           // Siempre actualizar a través de función de sincronización
                           updatePrices(value, 'USD')
                         }}
                         className="bg-white/5 border-gray-600 text-white"
                         placeholder="1.00"
                       />
                       <p className="text-xs text-gray-400 mt-1">
                         ${newDraw.number_price_usd || 0} USD
                       </p>
                     </div>
                     
                     <div>
                       <Label htmlFor="price_bs" className="text-white flex items-center gap-2">
                         🪙 Precio en Bolívares (Bs)
                         <input
                           type="radio"
                           checked={primaryCurrency === 'VES'}
                           onChange={() => setPrimaryCurrency('VES')}
                           className="w-3 h-3"
                         />
                       </Label>
                       <Input
                         id="price_bs"
                         type="number"
                         step="0.01"
                         min="0.01"
                         value={newDraw.number_price_bs || ''}
                         onChange={(e) => {
                           const value = parseFloat(e.target.value) || 0
                           // Siempre actualizar a través de función de sincronización
                           updatePrices(value, 'VES')
                         }}
                         className="bg-white/5 border-gray-600 text-white"
                         placeholder="162.95"
                       />
                       <p className="text-xs text-gray-400 mt-1">
                         {formatPrices(0, newDraw.number_price_bs || 0).bs}
                       </p>
                     </div>
                   </div>
                   
                   <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                     <span className="font-medium">💡 Consejo:</span> Selecciona la moneda principal para conversión automática
                   </div>
                 </div>

                 {/* Opción de inicio programado - TEMPORALMENTE DESHABILITADO */}
                 <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                   <div className="flex items-center space-x-3 mb-2">
                     <span className="text-yellow-400">⚠️</span>
                     <Label className="text-yellow-300 font-medium">
                       Programar inicio automático (No disponible)
                     </Label>
                   </div>
                   <p className="text-xs text-yellow-200">
                     Para habilitar esta función, ejecute primero la migración: 
                     <code className="bg-black/30 px-1 rounded ml-1">add_scheduled_start_time.sql</code>
                   </p>
                 </div>
                
                <div>
                  <Label htmlFor="prize_description" className="text-white">Descripción del Premio</Label>
                  <Textarea
                    id="prize_description"
                    value={newDraw.prize_description}
                    onChange={(e) => setNewDraw({ ...newDraw, prize_description: e.target.value })}
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="iPhone 15 Pro Max + AirPods Pro + Funda Premium..."
                    rows={3}
                    required
                  />
                </div>

                {/* Prize Images */}
                <div className="space-y-4">
                  <Label className="text-white">Imágenes del Premio (opcional, máximo 3)</Label>
                  
                  {[1, 2, 3].map((num) => (
                    <ImageUpload
                      key={num}
                      label={`Imagen ${num}`}
                      value={newDraw[`prize_image_${num}` as keyof CreateLotteryDrawData] as string || ''}
                      onChange={(url) => setNewDraw({ ...newDraw, [`prize_image_${num}`]: url })}
                      className="w-full"
                    />
                  ))}
                </div>
                
                                 <div className="flex gap-3 justify-end pt-4">
                   <Button
                     type="button"
                     onClick={() => setIsCreateDrawOpen(false)}
                     className="bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 transition-all duration-200 font-medium rounded-xl"
                   >
                     Cancelar
                   </Button>
                   <Button
                     type="submit"
                     disabled={createDrawMutation.isPending}
                     className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg hover:scale-105 transition-all duration-200 font-semibold rounded-xl"
                   >
                     {createDrawMutation.isPending ? 'Creando...' : 'Crear Sorteo'}
                   </Button>
                 </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Draw Modal */}
      <AnimatePresence>
        {isEditDrawOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsEditDrawOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Editar Sorteo</h3>
                                 <Button
                   onClick={() => setIsEditDrawOpen(false)}
                   size="sm"
                   className="text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                 >
                   <X className="w-4 h-4" />
                 </Button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateDraw(); }} className="space-y-6">
                <div>
                  <Label htmlFor="edit_draw_name" className="text-white">Nombre del Sorteo</Label>
                  <Input
                    id="edit_draw_name"
                    value={editDraw.draw_name}
                    onChange={(e) => setEditDraw({ ...editDraw, draw_name: e.target.value })}
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="#1 - Primer Sorteo del Mes"
                    required
                  />
                </div>

                {/* Configuración de tiempo del sorteo - Editar */}
                <div className="bg-white/5 border border-gray-600 rounded-lg p-4">
                  <Label className="text-white font-medium mb-4 block">⏱️ Duración del Sorteo</Label>
                  
                  {/* Botones de selección rápida para edición */}
                  <div className="mb-6">
                    <Label className="text-white text-sm mb-3 block">⚡ Selección rápida:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {quickDurationOptions.map((option) => (
                        <Button
                          key={option.label}
                          type="button"
                          onClick={() => handleEditQuickDurationSelect(option.minutes)}
                          className={`text-xs py-2 px-3 transition-all duration-200 ${
                            editDraw.duration_minutes === option.minutes
                              ? 'bg-purple-500 hover:bg-purple-600 text-white border-purple-400'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit_end_date" className="text-white">Fecha y Hora de Finalización</Label>
                      <Input
                        id="edit_end_date"
                        type="datetime-local"
                        value={editDraw.end_date}
                        onChange={(e) => handleEditEndDateChange(e.target.value)}
                        className="bg-white/5 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Opcional - se calculará automáticamente</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit_duration_minutes" className="text-white">Duración (minutos)</Label>
                      <Input
                        id="edit_duration_minutes"
                        type="number"
                        min="1"
                        step="1"
                        value={editDraw.duration_minutes || ''}
                        onChange={(e) => handleEditDurationChange(parseInt(e.target.value) || 0)}
                        className="bg-white/5 border-gray-600 text-white"
                        placeholder="60"
                      />
                      <p className="text-xs text-gray-400 mt-1">Por defecto: 60 minutos</p>
                    </div>
                    
                    <div className="flex items-end">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 w-full">
                        <div className="text-blue-300 text-sm font-medium mb-1">Duración calculada:</div>
                        <div className="text-blue-200 text-lg font-mono">
                          {editDraw.duration_minutes ? formatDuration(editDraw.duration_minutes) : '--'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                    <span className="font-medium">💡 Consejo:</span> Puedes establecer la duración en minutos o la fecha de finalización. Los campos se actualizarán automáticamente.
                  </div>
                </div>

                 {/* Configuración de precio por número */}
                 <div className="bg-white/5 border border-gray-600 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-4">
                     <Label className="text-white font-medium">💰 Precio por número</Label>
                     <div className="flex items-center gap-2 text-xs">
                       <span className={`px-2 py-1 rounded ${isStale ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                         {rateDisplay}
                       </span>
                       {isStale && <span className="text-yellow-400">⚠️ Desactualizado</span>}
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="price_usd" className="text-white flex items-center gap-2">
                         💵 Precio en Dólares (USD)
                         <input
                           type="radio"
                           checked={primaryCurrency === 'USD'}
                           onChange={() => setPrimaryCurrency('USD')}
                           className="w-3 h-3"
                         />
                       </Label>
                       <Input
                         id="price_usd"
                         type="number"
                         step="0.01"
                         min="0.01"
                         value={editDraw.number_price_usd || ''}
                         onChange={(e) => {
                           const value = parseFloat(e.target.value) || 0
                           updateEditPrices(value, 'USD')
                         }}
                         className="bg-white/5 border-gray-600 text-white"
                         placeholder="1.00"
                       />
                       <p className="text-xs text-gray-400 mt-1">
                         {formatPrices(editDraw.number_price_usd || 0, 0).usd}
                       </p>
                     </div>
                     
                     <div>
                       <Label htmlFor="price_bs" className="text-white flex items-center gap-2">
                         🪙 Precio en Bolívares (Bs)
                         <input
                           type="radio"
                           checked={primaryCurrency === 'VES'}
                           onChange={() => setPrimaryCurrency('VES')}
                           className="w-3 h-3"
                         />
                       </Label>
                       <Input
                         id="price_bs"
                         type="number"
                         step="0.01"
                         min="0.01"
                         value={editDraw.number_price_bs || ''}
                         onChange={(e) => {
                           const value = parseFloat(e.target.value) || 0
                           updateEditPrices(value, 'VES')
                         }}
                         className="bg-white/5 border-gray-600 text-white"
                         placeholder="162.95"
                       />
                       <p className="text-xs text-gray-400 mt-1">
                         {formatPrices(0, editDraw.number_price_bs || 0).bs}
                       </p>
                     </div>
                   </div>
                   
                   <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                     <span className="font-medium">💡 Consejo:</span> Los precios se sincronizan automáticamente con el tipo de cambio actual
                   </div>
                 </div>
                
                <div>
                  <Label htmlFor="edit_prize_description" className="text-white">Descripción del Premio</Label>
                  <Textarea
                    id="edit_prize_description"
                    value={editDraw.prize_description}
                    onChange={(e) => setEditDraw({ ...editDraw, prize_description: e.target.value })}
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400"
                    placeholder="iPhone 15 Pro Max + AirPods Pro + Funda Premium..."
                    rows={3}
                    required
                  />
                </div>

                {/* Prize Images */}
                <div className="space-y-4">
                  <Label className="text-white">Imágenes del Premio (opcional, máximo 3)</Label>
                  
                  {[1, 2, 3].map((num) => (
                    <ImageUpload
                      key={num}
                      label={`Imagen ${num}`}
                      value={editDraw[`prize_image_${num}` as keyof CreateLotteryDrawData] as string || ''}
                      onChange={(url) => setEditDraw({ ...editDraw, [`prize_image_${num}`]: url })}
                      className="w-full"
                    />
                  ))}
                </div>
                
                                 <div className="flex gap-3 justify-end pt-4">
                   <Button
                     type="button"
                     onClick={() => setIsEditDrawOpen(false)}
                     className="bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 transition-all duration-200 font-medium rounded-xl"
                   >
                     Cancelar
                   </Button>
                   <Button
                     type="submit"
                     disabled={updateDrawMutation.isPending}
                     className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg hover:scale-105 transition-all duration-200 font-semibold rounded-xl"
                   >
                     {updateDrawMutation.isPending ? 'Actualizando...' : 'Guardar Cambios'}
                   </Button>
                 </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Gallery */}
      <ImageGallery
        images={galleryImages}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        initialIndex={galleryStartIndex}
      />
    </div>
  )
} 