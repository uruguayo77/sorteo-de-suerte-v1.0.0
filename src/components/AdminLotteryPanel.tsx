import React, { useState } from 'react'
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
  useUpdateLotteryDraw
} from '@/hooks/use-supabase'
import { useDrawCountdown, formatCountdown } from '@/hooks/use-scheduled-draws'
import { useAutoUpdateCurrency, useCurrencyInfo, usePriceCalculator } from '@/hooks/use-currency'
import { MigrationStatus } from '@/components/ui/migration-status'
import { 
  LotteryDraw, 
  CreateLotteryDrawData
} from '@/lib/supabase'
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
  RotateCcw
} from 'lucide-react'

export function AdminLotteryPanel() {
  const [isCreateDrawOpen, setIsCreateDrawOpen] = useState(false)
  const [selectedDraw, setSelectedDraw] = useState<LotteryDraw | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryStartIndex, setGalleryStartIndex] = useState(0)
  
  const [newDraw, setNewDraw] = useState<CreateLotteryDrawData>({
    draw_name: '',
    draw_date: '',
    prize_description: '',
    prize_image_1: '',
    prize_image_2: '',
    prize_image_3: '',
    // scheduled_start_time: '', // Временно отключено
    number_price_usd: 1.00,
    number_price_bs: 162.95
    // created_by убрано - будет автоматически назначено в БД
  })
  
  const [enableDelayedStart, setEnableDelayedStart] = useState(false)
  const [primaryCurrency, setPrimaryCurrency] = useState<'USD' | 'VES'>('USD')

  // Хуки для работы с валютами
  useAutoUpdateCurrency() // Автоматическое обновление курса
  const { rateDisplay, currentRate, isStale } = useCurrencyInfo()
  const { calculatePrices, formatPrices } = usePriceCalculator()

  // Обновляем цены при изменении курса или базовой цены
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

  // Компонент для отображения таймера обратного отсчета
  const DrawCountdownTimer = ({ draw }: { draw: LotteryDraw }) => {
    // Временно отключено - требует миграции add_scheduled_start_time.sql
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

  // Реальные хуки для данных
  const { data: allDraws, isLoading, error } = useLotteryDraws()
  const createDrawMutation = useCreateLotteryDraw()
  const updateDrawMutation = useUpdateLotteryDraw()

  // Фильтрация активных и завершенных розыгрышей
  const activeDraws = allDraws?.filter(draw => 
    draw.status === 'scheduled' || draw.status === 'active'
  ) || []

  const completedDraws = allDraws?.filter(draw => 
    draw.status === 'finished' || draw.status === 'cancelled'
  ) || []

  // Фильтрация для истории с поиском
  const filteredHistory = completedDraws.filter(draw => {
    const matchesSearch = draw.draw_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || draw.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreateDraw = async () => {
    try {
      // Подготавливаем данные для создания
      const drawData: CreateLotteryDrawData = {
        ...newDraw,
        draw_name: newDraw.draw_name, // Номер добавится автоматически в БД
        // Временно отключено - требует миграции add_scheduled_start_time.sql
        // scheduled_start_time: enableDelayedStart ? newDraw.scheduled_start_time : undefined
      }
      
      await createDrawMutation.mutateAsync(drawData)
      
      const message = 'Sorteo creado exitosamente'
      
      toast.success(message)
      setIsCreateDrawOpen(false)
      setNewDraw({
        draw_name: '',
        draw_date: '',
        prize_description: '',
        prize_image_1: '',
        prize_image_2: '',
        prize_image_3: '',
        // scheduled_start_time: '', // Временно отключено
        number_price_usd: 1.00,
        number_price_bs: currentRate || 162.95
        // created_by убрано - будет автоматически назначено в БД
      })
      // setEnableDelayedStart(false) // Временно отключено
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
      case 'scheduled':
        return 'Programado'
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
      {/* Статус миграций */}
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
            className="bg-purple-600 hover:bg-purple-700 text-white border-0 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Sorteo
          </Button>
        </div>

        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Sorteos Activos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Sorteos Activos */}
        <TabsContent value="active" className="space-y-6">
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

                      {/* Таймер для отложенного запуска */}
                      <DrawCountdownTimer draw={draw} />

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
                      {draw.status === 'scheduled' && (
                        <Button
                          onClick={() => setSelectedDraw(draw)}
                          className="bg-purple-600 hover:bg-purple-700 text-white border-0 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
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
                            <SelectItem value="scheduled">Programado</SelectItem>
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
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center gap-2"
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
                      
                      {/* Таймер для отложенного запуска в истории */}
                      <DrawCountdownTimer draw={draw} />
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
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCreateDraw(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  
                  <div>
                    <Label htmlFor="draw_date" className="text-white">Fecha y Hora</Label>
                    <Input
                      id="draw_date"
                      type="datetime-local"
                      value={newDraw.draw_date}
                      onChange={(e) => setNewDraw({ ...newDraw, draw_date: e.target.value })}
                      className="bg-white/5 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>
                
                                 {/* Настройки цены номера */}
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
                           if (primaryCurrency === 'USD') {
                             updatePrices(value, 'USD')
                           } else {
                             setNewDraw(prev => ({ ...prev, number_price_usd: value }))
                           }
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
                           if (primaryCurrency === 'VES') {
                             updatePrices(value, 'VES')
                           } else {
                             setNewDraw(prev => ({ ...prev, number_price_bs: value }))
                           }
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

                 {/* Опция отложенного запуска - ВРЕМЕННО ОТКЛЮЧЕНО */}
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
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDrawMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                  >
                    {createDrawMutation.isPending ? 'Creando...' : 'Crear Sorteo'}
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