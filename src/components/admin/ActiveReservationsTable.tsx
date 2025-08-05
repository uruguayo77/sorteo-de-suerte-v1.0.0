/**
 * ActiveReservationsTable.tsx - Таблица активных бронирований с real-time countdown
 * Отображает подробную информацию о всех текущих бронированиях с таймерами
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveReservations } from '@/hooks/use-analytics-dashboard'
import { 
  Timer, 
  User, 
  Phone, 
  CreditCard, 
  Hash, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'

export function ActiveReservationsTable() {
  const { data: reservations, isLoading, isError, refetch, isFetching } = useActiveReservations()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'time_remaining' | 'created' | 'name'>('time_remaining')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Обновляем время каждую секунду для синхронизации
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Функция для получения реального статуса бронирования
  const getRealTimeStatus = (reservation: any) => {
    if (!reservation.reservation_expires_at) return 'no_timer'
    
    const now = currentTime.getTime()
    const expire = new Date(reservation.reservation_expires_at).getTime()
    const difference = expire - now
    
    if (difference <= 0) return 'expired'
    
    const totalSeconds = Math.floor(difference / 1000)
    if (totalSeconds <= 300) return 'expiring_soon' // 5 минут
    if (totalSeconds <= 600) return 'expiring_warning' // 10 минут
    
    return 'active'
  }

  // Фильтрация и сортировка с учетом реального времени
  const filteredAndSortedReservations = React.useMemo(() => {
    if (!reservations) return []

    let filtered = reservations.filter(reservation => {
      // Поиск по имени, телефону или cédula
      const searchMatch = !searchQuery || 
        reservation.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.user_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.cedula?.toLowerCase().includes(searchQuery.toLowerCase())

      // Фильтр по статусу с учетом реального времени
      const realTimeStatus = getRealTimeStatus(reservation)
      const statusMatch = statusFilter === 'all' || realTimeStatus === statusFilter

      return searchMatch && statusMatch
    })

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'time_remaining':
          // Сначала истекающие, потом по времени
          if (a.reservation_status === 'expiring_soon' && b.reservation_status !== 'expiring_soon') return -1
          if (b.reservation_status === 'expiring_soon' && a.reservation_status !== 'expiring_soon') return 1
          return (a.seconds_remaining || 0) - (b.seconds_remaining || 0)
        
        case 'created':
          return new Date(b.reservation_started_at || 0).getTime() - new Date(a.reservation_started_at || 0).getTime()
        
        case 'name':
          return (a.user_name || '').localeCompare(b.user_name || '')
        
        default:
          return 0
      }
    })

    return filtered
  }, [reservations, searchQuery, statusFilter, sortBy, currentTime])

  // Статистика с учетом реального времени
  const stats = React.useMemo(() => {
    if (!reservations) return { total: 0, active: 0, expiring: 0, critical: 0, expired: 0 }

    const statusCounts = reservations.reduce((acc, reservation) => {
      const realStatus = getRealTimeStatus(reservation)
      acc[realStatus] = (acc[realStatus] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: reservations.length,
      active: statusCounts.active || 0,
      expiring: statusCounts.expiring_warning || 0,
      critical: statusCounts.expiring_soon || 0,
      expired: statusCounts.expired || 0
    }
  }, [reservations, currentTime])

  if (isError) {
    return (
      <Card className="bg-gray-800/50 border-gray-600">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-400 mb-4">Error al cargar las reservas activas</p>
            <Button onClick={() => refetch()} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/50 border-gray-600">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Reservas Activas
            {stats.critical > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {stats.critical} críticas
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              🕒 Tiempo real: {currentTime.toLocaleTimeString()}
            </Badge>
          </CardTitle>
          
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Estadísticas rápidas - actualizadas en tiempo real */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-xs text-gray-400">Activas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.expiring}</p>
            <p className="text-xs text-gray-400">Advertencia</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400 animate-pulse">{stats.critical}</p>
            <p className="text-xs text-gray-400">Críticas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.expired}</p>
            <p className="text-xs text-gray-400">Expiradas</p>
          </div>
        </div>

        {/* Controles de filtrado */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, teléfono o cédula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="expiring_warning">Con advertencia</SelectItem>
              <SelectItem value="expiring_soon">Críticas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="time_remaining">Por tiempo restante</SelectItem>
              <SelectItem value="created">Por fecha de creación</SelectItem>
              <SelectItem value="name">Por nombre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredAndSortedReservations.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-600">
                  <TableHead className="text-gray-300 min-w-[80px]">Estado</TableHead>
                  <TableHead className="text-gray-300 min-w-[120px]">Usuario</TableHead>
                  <TableHead className="text-gray-300 min-w-[120px] hidden sm:table-cell">Contacto</TableHead>
                  <TableHead className="text-gray-300 min-w-[100px] hidden md:table-cell">Números</TableHead>
                  <TableHead className="text-gray-300 min-w-[120px] hidden lg:table-cell">Sorteo</TableHead>
                  <TableHead className="text-gray-300 min-w-[150px]">Tiempo Restante</TableHead>
                  <TableHead className="text-gray-300 min-w-[120px] hidden xl:table-cell">Iniciada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedReservations.map((reservation, index) => (
                  <motion.tr
                    key={reservation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-gray-600 hover:bg-gray-700/30"
                  >
                    <TableCell>
                      <ReservationStatusBadge status={reservation.reservation_status} />
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-white font-medium text-sm">
                            {reservation.user_name || 'Sin nombre'}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {reservation.cedula || 'Sin cédula'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-300 text-sm">
                          {reservation.user_phone || 'Sin teléfono'}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-wrap gap-1 max-w-[100px]">
                          {Array.isArray(reservation.numbers) ? 
                            reservation.numbers.slice(0, 3).map((number, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {number}
                              </Badge>
                            )) : 
                            <span className="text-gray-400 text-xs">Sin números</span>
                          }
                          {Array.isArray(reservation.numbers) && reservation.numbers.length > 3 && (
                            <span className="text-gray-400 text-xs">+{reservation.numbers.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-300 text-sm truncate max-w-[120px]">
                            {reservation.draw_name || 'Sin sorteo'}
                          </p>
                          {reservation.draw_date && (
                            <p className="text-gray-400 text-xs">
                              {new Date(reservation.draw_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <CountdownDisplay 
                        expiresAt={reservation.reservation_expires_at}
                        status={getRealTimeStatus(reservation)}
                        secondsRemaining={reservation.seconds_remaining}
                      />
                    </TableCell>
                    
                    <TableCell className="hidden xl:table-cell">
                      <p className="text-gray-300 text-sm">
                        {reservation.reservation_started_at ? 
                          new Date(reservation.reservation_started_at).toLocaleString() : 
                          'Desconocida'
                        }
                      </p>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Timer className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No hay reservas activas
            </h3>
            <p className="text-gray-400">
              {searchQuery || statusFilter !== 'all' ? 
                'No se encontraron reservas con los filtros aplicados.' :
                'Todas las reservas están completas o han expirado.'
              }
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente para mostrar estado de reserva
interface ReservationStatusBadgeProps {
  status: string
}

function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'expiring_soon':
        return {
          variant: 'destructive' as const,
          icon: <AlertTriangle className="w-3 h-3" />,
          text: 'Crítico',
          className: 'animate-pulse'
        }
      case 'expiring_warning':
        return {
          variant: 'outline' as const,
          icon: <AlertTriangle className="w-3 h-3" />,
          text: 'Advertencia',
          className: 'border-yellow-500 text-yellow-400'
        }
      case 'expired':
        return {
          variant: 'secondary' as const,
          icon: <XCircle className="w-3 h-3" />,
          text: 'Expirado',
          className: ''
        }
      case 'active':
      default:
        return {
          variant: 'default' as const,
          icon: <CheckCircle className="w-3 h-3" />,
          text: 'Activo',
          className: 'border-green-500 text-green-400'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      {config.icon}
      {config.text}
    </Badge>
  )
}

// Componente countdown con actualización en реального времени
interface CountdownDisplayProps {
  expiresAt?: string
  status: string
  secondsRemaining?: number
}

function CountdownDisplay({ expiresAt, status, secondsRemaining }: CountdownDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState(status)
  const [isExpired, setIsExpired] = useState(false)

  React.useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('Sin límite')
      setCurrentStatus('no_timer')
      setIsExpired(false)
      return
    }

    const interval = setInterval(() => {
      // Используем UTC время для точного расчета
      const now = new Date().getTime()
      const expire = new Date(expiresAt).getTime()
      const difference = expire - now

      if (difference <= 0) {
        setTimeLeft('Expirado')
        setCurrentStatus('expired')
        setIsExpired(true)
        return
      }

      const totalSeconds = Math.floor(difference / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      
      // Обновляем статус в реальном времени
      if (totalSeconds <= 300) { // 5 минут
        setCurrentStatus('expiring_soon')
      } else if (totalSeconds <= 600) { // 10 минут
        setCurrentStatus('expiring_warning')
      } else {
        setCurrentStatus('active')
      }
      
      if (hours > 0) {
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
      
      setIsExpired(false)
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const getTimeColor = () => {
    if (isExpired || currentStatus === 'expired') return 'text-red-400'
    if (currentStatus === 'expiring_soon') return 'text-red-400 animate-pulse'
    if (currentStatus === 'expiring_warning') return 'text-yellow-400'
    if (currentStatus === 'no_timer') return 'text-blue-400'
    return 'text-green-400'
  }

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Expirado
          </Badge>
        )
      case 'expiring_soon':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Crítico
          </Badge>
        )
      case 'expiring_warning':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            Advertencia
          </Badge>
        )
      case 'no_timer':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-400">
            <Timer className="w-3 h-3" />
            Sin límite
          </Badge>
        )
      default:
        return (
          <Badge variant="default" className="flex items-center gap-1 border-green-500 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Activo
          </Badge>
        )
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:gap-2">
      <div className="flex items-center gap-1 sm:gap-2">
        <Timer className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
        <div>
          <p className={`text-xs sm:text-sm font-mono font-bold ${getTimeColor()}`}>
            {timeLeft}
          </p>
          {!isExpired && expiresAt && currentStatus !== 'no_timer' && (
            <p className="text-xs text-gray-400 hidden sm:block">
              hasta {new Date(expiresAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
      <div className="w-full">
        {getStatusBadge()}
      </div>
    </div>
  )
}