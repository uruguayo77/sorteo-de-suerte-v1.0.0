/**
 * ActivityChart.tsx - Графики активности пользователей
 * Отображает графики активности по часам и дням с использованием Recharts
 */

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalyticsDashboard } from '@/hooks/use-analytics-dashboard'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Calendar,
  Activity,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react'

type ChartType = 'area' | 'bar' | 'line' | 'pie'
type TimeRange = 'hour' | 'day' | 'week'

export function ActivityChart() {
  const { queries, isLoading } = useAnalyticsDashboard()
  const [chartType, setChartType] = useState<ChartType>('area')
  const [timeRange, setTimeRange] = useState<TimeRange>('hour')

  // Обработка данных для графиков
  const chartData = useMemo(() => {
    if (!queries.activeUsers.data) return []

    const now = new Date()
    const data: any[] = []

    if (timeRange === 'hour') {
      // Активность по часам (последние 24 часа)
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourLabel = hour.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        
        // Симулируем данные на основе реальных пользователей
        const activeCount = queries.activeUsers.data.filter(user => {
          const userHour = new Date(user.last_activity).getHours()
          return userHour === hour.getHours()
        }).length
        
        // Добавляем базовую активность для демонстрации
        const baseActivity = Math.max(1, Math.floor(Math.random() * 5) + activeCount)
        
        data.push({
          time: hourLabel,
          usuarios: baseActivity,
          nuevos: Math.floor(baseActivity * 0.3),
          activos: activeCount,
          conversiones: Math.floor(baseActivity * 0.15)
        })
      }
    } else if (timeRange === 'day') {
      // Активность по дням (последние 7 дней)
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayLabel = day.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
        
        // Симулируем дневную активность
        const baseActivity = Math.floor(Math.random() * 20) + 5
        
        data.push({
          time: dayLabel,
          usuarios: baseActivity,
          nuevos: Math.floor(baseActivity * 0.4),
          activos: Math.floor(baseActivity * 0.6),
          conversiones: Math.floor(baseActivity * 0.2)
        })
      }
    } else {
      // Активность по неделям (последние 4 недели)
      for (let i = 3; i >= 0; i--) {
        const week = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        const weekLabel = `Sem ${Math.ceil(week.getDate() / 7)}`
        
        const baseActivity = Math.floor(Math.random() * 100) + 20
        
        data.push({
          time: weekLabel,
          usuarios: baseActivity,
          nuevos: Math.floor(baseActivity * 0.3),
          activos: Math.floor(baseActivity * 0.7),
          conversiones: Math.floor(baseActivity * 0.25)
        })
      }
    }

    return data
  }, [queries.activeUsers.data, timeRange])

  // Данные для круговой диаграммы (типы активности)
  const pieData = useMemo(() => {
    if (!queries.activeUsers.data) return []

    const actionTypes = queries.activeUsers.data.reduce((acc, user) => {
      user.actions_performed.forEach(action => {
        acc[action] = (acc[action] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    return Object.entries(actionTypes).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
      percentage: Math.round((value / queries.activeUsers.data!.length) * 100)
    }))
  }, [queries.activeUsers.data])

  // Цвета для графиков
  const colors = {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6'
  }

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  // Кастомный tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percentage }) => `${name} ${percentage}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="usuarios" 
              stackId="1"
              stroke={colors.primary} 
              fill={colors.primary} 
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="activos" 
              stackId="1"
              stroke={colors.secondary} 
              fill={colors.secondary} 
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="usuarios" fill={colors.primary} />
            <Bar dataKey="nuevos" fill={colors.secondary} />
            <Bar dataKey="conversiones" fill={colors.accent} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="usuarios" 
            stroke={colors.primary} 
            strokeWidth={2}
            dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="activos" 
            stroke={colors.secondary} 
            strokeWidth={2}
            dot={{ fill: colors.secondary, strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="conversiones" 
            stroke={colors.accent} 
            strokeWidth={2}
            dot={{ fill: colors.accent, strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Gráficos de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full bg-gray-700" />
        </CardContent>
      </Card>
    )
  }

  const totalUsers = chartData.reduce((sum, item) => sum + item.usuarios, 0)
  const avgUsers = Math.round(totalUsers / chartData.length)
  const trend = chartData.length > 1 ? 
    ((chartData[chartData.length - 1]?.usuarios - chartData[0]?.usuarios) / chartData[0]?.usuarios * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gray-800/50 border-gray-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Gráficos de Actividad
              <Badge variant="outline" className="text-xs">
                {timeRange === 'hour' ? 'Últimas 24h' : 
                 timeRange === 'day' ? 'Últimos 7 días' : 'Últimas 4 semanas'}
              </Badge>
            </CardTitle>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger className="w-full sm:w-32 bg-gray-700 border-gray-600 text-white">
                  <Clock className="w-4 h-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="hour">Por hora</SelectItem>
                  <SelectItem value="day">Por día</SelectItem>
                  <SelectItem value="week">Por semana</SelectItem>
                </SelectContent>
              </Select>

              <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
                <SelectTrigger className="w-full sm:w-32 bg-gray-700 border-gray-600 text-white">
                  {chartType === 'area' && <Activity className="w-4 h-4 mr-1" />}
                  {chartType === 'bar' && <BarChart3 className="w-4 h-4 mr-1" />}
                  {chartType === 'line' && <LineChartIcon className="w-4 h-4 mr-1" />}
                  {chartType === 'pie' && <PieChartIcon className="w-4 h-4 mr-1" />}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="line">Líneas</SelectItem>
                  <SelectItem value="pie">Circular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{avgUsers}</p>
              <p className="text-xs text-gray-400">Promedio</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{totalUsers}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <p className={`text-2xl font-bold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.abs(trend).toFixed(1)}%
                </p>
                {trend > 0 ? 
                  <TrendingUp className="w-4 h-4 text-green-400" /> : 
                  <TrendingDown className="w-4 h-4 text-red-400" />
                }
              </div>
              <p className="text-xs text-gray-400">Tendencia</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            {renderChart()}
          </div>
          
          {/* Leyenda */}
          {chartType !== 'pie' && (
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs sm:text-sm text-gray-300">Total usuarios</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs sm:text-sm text-gray-300">Usuarios activos</span>
              </div>
              {chartType === 'bar' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs sm:text-sm text-gray-300">Conversiones</span>
                </div>
              )}
            </div>
          )}

          {/* Información adicional para gráfico circular */}
          {chartType === 'pie' && pieData.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  ></div>
                  <span className="text-xs sm:text-sm text-gray-300 truncate">
                    {item.name}: {item.value} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}