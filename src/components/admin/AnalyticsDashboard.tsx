/**
 * AnalyticsDashboard.tsx - Главный компонент аналитического дашборда
 * Отображает real-time метрики активности пользователей и бронирований
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAnalyticsDashboard, useAnalyticsAlerts } from '@/hooks/use-analytics-dashboard'
import { AnalyticsExport } from './AnalyticsExport'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  RefreshCw,
  Download,
  Trash2,
  Eye,
  Timer,
  DollarSign
} from 'lucide-react'

export function AnalyticsDashboard() {
  const {
    data,
    stats,
    isLoading,
    isError,
    hasData,
    queries,
    refreshAll,
    clearCache,
    lastRefresh
  } = useAnalyticsDashboard()

  const { alertsCount } = useAnalyticsAlerts()

  // Обработка состояния загрузки
  if (isLoading && !hasData) {
    return <AnalyticsDashboardSkeleton />
  }

  // Обработка ошибок
  if (isError && !hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Analítica en Tiempo Real</h2>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los datos de analítica. Por favor, inténtalo de nuevo.
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button onClick={refreshAll} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
          <Button onClick={clearCache} variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            Limpiar caché
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analítica en Tiempo Real</h2>
          <p className="text-gray-400 text-sm">
            Última actualización: {lastRefresh}
            {stats.lastUpdated && (
              <span className="ml-2">
                • Datos del servidor: {new Date(stats.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {alertsCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {alertsCount} alertas activas
            </Badge>
          )}
          
          <Button 
            onClick={refreshAll} 
            variant="outline" 
            size="sm"
            disabled={queries.realtime.isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${queries.realtime.isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button 
            onClick={() => {
              // Scroll to export section
              document.getElementById('analytics-export')?.scrollIntoView({ behavior: 'smooth' })
            }}
            variant="outline" 
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Usuarios en línea */}
        <MetricCard
          title="Usuarios en Línea"
          value={stats.usersOnline}
          icon={<Users className="w-5 h-5" />}
          color="green"
          subtitle="Últimos 10 minutos"
          isLoading={queries.realtime.isFetching}
        />

        {/* Reservas activas */}
        <MetricCard
          title="Reservas Activas"
          value={stats.activeReservations}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
          subtitle="En proceso"
          isLoading={queries.realtime.isFetching}
        />

        {/* Reservas expirando */}
        <MetricCard
          title="Expirando Pronto"
          value={stats.expiringReservations}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={stats.expiringReservations > 0 ? "red" : "gray"}
          subtitle="< 5 minutos"
          isLoading={queries.realtime.isFetching}
          isAlert={stats.expiringReservations > 0}
        />

        {/* Tasa de conversión */}
        <MetricCard
          title="Conversión Hoy"
          value={`${stats.conversionRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color={stats.conversionRate >= 70 ? "green" : stats.conversionRate >= 50 ? "yellow" : "red"}
          subtitle="Reserva → Pago"
          isLoading={queries.realtime.isFetching}
        />

        {/* Actividad por hora */}
        <MetricCard
          title="Actividad/Hora"
          value={stats.hourlyActivity}
          icon={<Activity className="w-5 h-5" />}
          color="purple"
          subtitle="Última hora"
          isLoading={queries.realtime.isFetching}
        />
      </div>

      {/* Alertas críticas */}
      {data.activeReservations && data.activeReservations.some(r => r.reservation_status === 'expiring_soon') && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              ¡Hay {data.activeReservations.filter(r => r.reservation_status === 'expiring_soon').length} reservas 
              expirando en menos de 5 minutos!
            </span>
            <Button size="sm" variant="destructive">
              Ver Detalles
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Información detallada en columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usuarios activos */}
        <Card className="bg-gray-800/50 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuarios Activos
            </CardTitle>
            <CardDescription>
              Actividad en los últimos 10 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {queries.activeUsers.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data.activeUsers.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.activeUsers.slice(0, 10).map((user, index) => (
                  <motion.div
                    key={user.session_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {user.user_ip || 'IP oculta'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {user.page_views} páginas • {user.pages_visited.join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        Último: {new Date(user.last_activity).toLocaleTimeString()}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {user.actions_performed.length} acciones
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay usuarios activos en este momento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservas activas con countdown */}
        <Card className="bg-gray-800/50 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Reservas con Countdown
            </CardTitle>
            <CardDescription>
              Reservas en proceso con tiempo restante
            </CardDescription>
          </CardHeader>
          <CardContent>
            {queries.activeReservations.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : data.activeReservations.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.activeReservations.slice(0, 8).map((reservation, index) => (
                  <motion.div
                    key={reservation.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${getReservationBorderColor(reservation.reservation_status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">
                          {reservation.user_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Números: {Array.isArray(reservation.numbers) ? reservation.numbers.join(', ') : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {reservation.draw_name || 'Sin sorteo'}
                        </p>
                      </div>
                      <div className="text-right">
                        <CountdownTimer 
                          expiresAt={reservation.reservation_expires_at}
                          status={reservation.reservation_status}
                        />
                        <Badge 
                          variant={getReservationVariant(reservation.reservation_status)}
                          className="text-xs mt-1"
                        >
                          {getReservationStatusText(reservation.reservation_status)}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay reservas activas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de conversión */}
      <Card className="bg-gray-800/50 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Estadísticas de Conversión
          </CardTitle>
          <CardDescription>
            Rendimiento de reservas en los últimos días
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queries.conversionStats.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data.conversionStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {data.conversionStats.slice(0, 5).map((stat, index) => (
                <motion.div
                  key={stat.date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-700/30 rounded-lg"
                >
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(stat.date).toLocaleDateString()}
                    </p>
                    <p className="text-2xl font-bold text-white mb-1">
                      {stat.conversion_rate_percent}%
                    </p>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>Creadas: {stat.reservations_created}</p>
                      <p>Pagadas: {stat.reservations_paid}</p>
                      <p>Expiradas: {stat.reservations_expired}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay datos de conversión disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de exportación */}
      <div id="analytics-export">
        <AnalyticsExport />
      </div>
    </div>
  )
}

// Componente para tarjetas de métricas
interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray'
  subtitle?: string
  isLoading?: boolean
  isAlert?: boolean
}

function MetricCard({ title, value, icon, color, subtitle, isLoading, isAlert }: MetricCardProps) {
  const colorClasses = {
    green: 'border-green-500/50 bg-green-500/10 text-green-400',
    blue: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    red: 'border-red-500/50 bg-red-500/10 text-red-400',
    yellow: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    purple: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
    gray: 'border-gray-500/50 bg-gray-500/10 text-gray-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-lg border ${colorClasses[color]} ${isAlert ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        {icon}
        {isLoading && <RefreshCw className="w-4 h-4 animate-spin opacity-50" />}
      </div>
      
      <div>
        {isLoading ? (
          <Skeleton className="h-8 w-16 mb-1" />
        ) : (
          <p className="text-2xl font-bold text-white mb-1">{value}</p>
        )}
        
        <p className="text-xs opacity-80">{title}</p>
        {subtitle && (
          <p className="text-xs opacity-60 mt-1">{subtitle}</p>
        )}
      </div>
    </motion.div>
  )
}

// Компонент countdown таймера
interface CountdownTimerProps {
  expiresAt?: string
  status: string
}

function CountdownTimer({ expiresAt, status }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState<string>('')

  React.useEffect(() => {
    if (!expiresAt || status === 'expired') {
      setTimeLeft('Expirado')
      return
    }

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expire = new Date(expiresAt).getTime()
      const difference = expire - now

      if (difference <= 0) {
        setTimeLeft('Expirado')
        return
      }

      const minutes = Math.floor(difference / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, status])

  const getTimeColor = () => {
    if (status === 'expired') return 'text-red-400'
    if (status === 'expiring_soon') return 'text-red-400'
    if (status === 'expiring_warning') return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <p className={`text-sm font-mono font-bold ${getTimeColor()}`}>
      {timeLeft}
    </p>
  )
}

// Утилиты для стилизации резерваций
function getReservationBorderColor(status: string): string {
  switch (status) {
    case 'expiring_soon': return 'border-red-500 bg-red-500/10'
    case 'expiring_warning': return 'border-yellow-500 bg-yellow-500/10'
    case 'expired': return 'border-gray-500 bg-gray-500/10'
    default: return 'border-green-500 bg-green-500/10'
  }
}

function getReservationVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case 'expiring_soon': return 'destructive'
    case 'expiring_warning': return 'outline'
    case 'expired': return 'secondary'
    default: return 'default'
  }
}

function getReservationStatusText(status: string): string {
  switch (status) {
    case 'expiring_soon': return 'Crítico'
    case 'expiring_warning': return 'Advertencia'
    case 'expired': return 'Expirado'
    case 'no_timer': return 'Sin límite'
    default: return 'Activo'
  }
}

// Skeleton для состояния загрузки
function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    </div>
  )
}