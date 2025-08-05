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

  // Фильтрация и сортировка
  const filteredAndSortedReservations = React.useMemo(() => {
    if (!reservations) return []

    let filtered = reservations.filter(reservation => {
      // Поиск по имени, телефону или cédula
      const searchMatch = !searchQuery || 
        reservation.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.user_phone?.includes(searchQuery) ||
        reservation.cedula?.includes(searchQuery)

      // Фильтр по статусу
      const statusMatch = statusFilter === 'all' || reservation.reservation_status === statusFilter

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
  }, [reservations, searchQuery, statusFilter, sortBy])

  // Статистика
  const stats = React.useMemo(() => {
    if (!reservations) return { total: 0, active: 0, expiring: 0, critical: 0 }

    return {
      total: reservations.length,
      active: reservations.filter(r => r.reservation_status === 'active').length,
      expiring: reservations.filter(r => r.reservation_status === 'expiring_warning').length,
      critical: reservations.filter(r => r.reservation_status === 'expiring_soon').length
    }
  }, [reservations])

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

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-4 gap-4 mt-4">
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
            <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
            <p className="text-xs text-gray-400">Críticas</p>
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
                  <TableHead className="text-gray-300">Estado</TableHead>
                  <TableHead className="text-gray-300">Usuario</TableHead>
                  <TableHead className="text-gray-300">Contacto</TableHead>
                  <TableHead className="text-gray-300">Números</TableHead>
                  <TableHead className="text-gray-300">Sorteo</TableHead>
                  <TableHead className="text-gray-300">Tiempo Restante</TableHead>
                  <TableHead className="text-gray-300">Iniciada</TableHead>
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
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-300 text-sm">
                          {reservation.user_phone || 'Sin teléfono'}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(reservation.numbers) ? 
                            reservation.numbers.map((number, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {number}
                              </Badge>
                            )) : 
                            <span className="text-gray-400 text-xs">Sin números</span>
                          }
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-300 text-sm">
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
                        status={reservation.reservation_status}
                        secondsRemaining={reservation.seconds_remaining}
                      />
                    </TableCell>
                    
                    <TableCell>
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
  const [isExpired, setIsExpired] = useState(false)

  React.useEffect(() => {
    if (!expiresAt || status === 'expired') {
      setTimeLeft('Expirado')
      setIsExpired(true)
      return
    }

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expire = new Date(expiresAt).getTime()
      const difference = expire - now

      if (difference <= 0) {
        setTimeLeft('Expirado')
        setIsExpired(true)
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      
      if (hours > 0) {
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
      
      setIsExpired(false)
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, status])

  const getTimeColor = () => {
    if (isExpired || status === 'expired') return 'text-red-400'
    if (status === 'expiring_soon') return 'text-red-400 animate-pulse'
    if (status === 'expiring_warning') return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="flex items-center gap-2">
      <Timer className="w-4 h-4 text-gray-400" />
      <div>
        <p className={`text-sm font-mono font-bold ${getTimeColor()}`}>
          {timeLeft}
        </p>
        {!isExpired && expiresAt && (
          <p className="text-xs text-gray-400">
            hasta {new Date(expiresAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}