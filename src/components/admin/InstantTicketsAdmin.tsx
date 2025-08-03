import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  useInstantTicketsAdmin, 
  useInstantTicketsStats,
  useInstantTicketsGroupedByDraw,
  useClaimPrize,
  InstantTicketUtils
} from '@/hooks/use-instant-tickets'
import { 
  Ticket, 
  Trophy, 
  Gift, 
  User, 
  Phone,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Search,
  Hash,
  Calendar,
  Banknote,
  Clock,
  X,
  Filter
} from 'lucide-react'

const InstantTicketsAdmin: React.FC = () => {
  const [filters, setFilters] = useState<{
    is_winner?: boolean
    is_scratched?: boolean  
    is_claimed?: boolean
    limit?: number
  }>({ limit: 50 })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)

  const { data: tickets, isLoading: ticketsLoading, error } = useInstantTicketsAdmin(filters)
  const { data: groupedTickets, isLoading: groupedLoading } = useInstantTicketsGroupedByDraw()
  const { data: stats, isLoading: statsLoading } = useInstantTicketsStats()
  const claimPrizeMutation = useClaimPrize()

  // Функция для проверки локального состояния билета (стерт ли он)
  const isTicketScratchedLocally = (ticketId: string) => {
    const localState = localStorage.getItem(`ticket_${ticketId}_scratched`)
    return localState === 'true'
  }

  // Функция проверки - билет стерт если стерт в БД ИЛИ локально
  const isTicketScratched = (ticket: any) => {
    return ticket.is_scratched || isTicketScratchedLocally(ticket.id)
  }

  // Слушаем изменения localStorage для синхронизации в реальном времени
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('💾 Админ: localStorage изменился, обновляем билеты')
      setForceUpdate(prev => prev + 1)
    }

    const handleTicketStateChange = (event: CustomEvent) => {
      console.log('🎫 Админ: Билет изменился:', event.detail)
      setForceUpdate(prev => prev + 1)
    }

    // Слушаем изменения в других вкладках
    window.addEventListener('storage', handleStorageChange)
    
    // Слушаем изменения состояния билетов
    window.addEventListener('ticketStateChanged', handleTicketStateChange as EventListener)
    
    // Периодически проверяем изменения
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1)
    }, 10000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('ticketStateChanged', handleTicketStateChange as EventListener)
      clearInterval(interval)
    }
  }, [])

  // Фильтрация и поиск билетов с учетом localStorage и группировки
  const filteredGroupedTickets = useMemo(() => {
    if (!groupedTickets) return []
    
    console.log('🔍 Применяем фильтры:', filters)
    
    const result = groupedTickets.map(group => {
      // Фильтр по выбранному розыгрышу
      if (selectedDrawId && group.draw_id !== selectedDrawId) {
        return null
      }
      
      // Фильтруем билеты в группе
      let filteredTickets = group.tickets
      
      if (searchQuery && searchQuery.trim().length > 0) {
        const searchLower = searchQuery.toLowerCase().trim()
        
        // Проверяем название розыгрыша
        const matchesDrawName = group.draw_name?.toLowerCase().includes(searchLower) || false
        
        if (matchesDrawName) {
          // Если название розыгрыша совпадает, показываем все билеты в этой группе
          filteredTickets = group.tickets
        } else {
          // Иначе фильтруем билеты по содержимому
          filteredTickets = group.tickets.filter(ticket => {
            const isReallyScratched = isTicketScratched(ticket)
            
            // 1. Применяем фильтры состояния (учитываем localStorage)
            // Фильтр по стертости
            if (filters.is_scratched !== undefined) {
              if (filters.is_scratched && !isReallyScratched) return false
              if (!filters.is_scratched && isReallyScratched) return false
            }
            
            // Фильтр по выигрышности
            if (filters.is_winner !== undefined) {
              if (filters.is_winner && !ticket.is_winner) return false
              if (!filters.is_winner && ticket.is_winner) return false
            }
            
            // Фильтр по выплатам
            if (filters.is_claimed !== undefined) {
              if (filters.is_claimed && !ticket.is_claimed) return false
              if (!filters.is_claimed && ticket.is_claimed) return false
            }
            
            // Дополнительная логика для фильтра "Raspados" - показываем только невыигрышные стертые
            if (filters.is_scratched === true && filters.is_winner === undefined) {
              if (ticket.is_winner) return false // Исключаем выигрышные из "Raspados"
            }
            
            // Дополнительная логика для фильтра "Entregados" - показываем только стертые и выплаченные
            if (filters.is_winner === true && filters.is_claimed === true && filters.is_scratched === undefined) {
              if (!isReallyScratched) return false // Исключаем нестертые из "Entregados"
            }
            
            // Дополнительная логика для фильтра "Pendientes de entregar" - показываем только стертые и невыплаченные
            if (filters.is_winner === true && filters.is_claimed === false && filters.is_scratched === undefined) {
              if (!isReallyScratched) return false // Исключаем нестертые из "Pendientes"
            }
            
            // 2. Применяем поиск
            const query = searchQuery.toLowerCase().trim()
            if (!query) return true
            
            // Поиск по различным полям
            const searchFields = [
              ticket.ticket_number?.toLowerCase(),
              ticket.barcode?.toLowerCase(),
              ticket.applications?.user_name?.toLowerCase(),
              ticket.applications?.user_phone?.toLowerCase(),
              ticket.applications?.cedula?.toLowerCase(),
              ticket.applications?.numbers?.join(' ')?.toLowerCase(),
              ticket.prize_amount?.toString()
            ].filter(Boolean)
            
            return searchFields.some(field => field?.includes(query))
          })
        }
      } else {
        // Если нет поиска, применяем только фильтры состояния
        filteredTickets = group.tickets.filter(ticket => {
          const isReallyScratched = isTicketScratched(ticket)
          
          // Фильтр по стертости
          if (filters.is_scratched !== undefined) {
            if (filters.is_scratched && !isReallyScratched) return false
            if (!filters.is_scratched && isReallyScratched) return false
          }
          
          // Фильтр по выигрышности
          if (filters.is_winner !== undefined) {
            if (filters.is_winner && !ticket.is_winner) return false
            if (!filters.is_winner && ticket.is_winner) return false
          }
          
          // Фильтр по выплатам
          if (filters.is_claimed !== undefined) {
            if (filters.is_claimed && !ticket.is_claimed) return false
            if (!filters.is_claimed && ticket.is_claimed) return false
          }
          
          // Дополнительная логика для фильтра "Raspados" - показываем только невыигрышные стертые
          if (filters.is_scratched === true && filters.is_winner === undefined) {
            if (ticket.is_winner) return false // Исключаем выигрышные из "Raspados"
          }
          
          // Дополнительная логика для фильтра "Entregados" - показываем только стертые и выплаченные
          if (filters.is_winner === true && filters.is_claimed === true && filters.is_scratched === undefined) {
            if (!isReallyScratched) return false // Исключаем нестертые из "Entregados"
          }
          
          // Дополнительная логика для фильтра "Pendientes de entregar" - показываем только стертые и невыплаченные
          if (filters.is_winner === true && filters.is_claimed === false && filters.is_scratched === undefined) {
            if (!isReallyScratched) return false // Исключаем нестертые из "Pendientes"
          }
          
          return true
        })
      }
      
      // Возвращаем группу только если есть билеты после фильтрации
      if (filteredTickets.length > 0) {
        return {
          ...group,
          tickets: filteredTickets
        }
      }
      
      return null
    }).filter(Boolean) // Убираем null значения
    
    console.log(`📊 Фильтр результат: ${result.length} групп`)
    
    return result
  }, [groupedTickets, searchQuery, selectedDrawId, forceUpdate, filters])

  const handleClaimPrize = async (ticketId: string) => {
    try {
      console.log('🔄 Начинаем выплату приза для билета:', ticketId)
      
      const result = await claimPrizeMutation.mutateAsync(ticketId)
      
      console.log('✅ Результат выплаты:', result)
      
      // Принудительно обновляем интерфейс после выплаты
      setForceUpdate(prev => prev + 1)
      
      // Дополнительно инвалидируем запросы
      setTimeout(() => {
        setForceUpdate(prev => prev + 1)
      }, 1000)
      
      console.log('✅ Приз отмечен как выплаченный:', ticketId)
    } catch (error) {
      console.error('❌ Ошибка отметки выплаты:', error)
      console.error('❌ Подробности ошибки:', {
        message: error.message,
        stack: error.stack
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Gestión de Billetes Instantáneos</h1>
        </div>
        
        {/* Поиск и фильтры */}
        <div className="flex items-center gap-4">
          {/* Поиск */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre, teléfono, número de billete..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          
          {/* Фильтр по розыгрышу */}
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={selectedDrawId || ''}
              onChange={(e) => setSelectedDrawId(e.target.value || null)}
              className="w-48 pl-10 pr-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
            >
              <option value="">Todos los sorteos</option>
              {groupedTickets?.map(group => (
                <option key={group.draw_id || 'no-draw'} value={group.draw_id || ''}>
                  {group.draw_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Статистика с синхронизацией localStorage */}
      {stats && tickets && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4 bg-white/10 backdrop-blur-sm border-gray-700">
            <div className="flex items-center gap-3">
              <Ticket className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Billetes</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm border-gray-700">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {tickets.filter(t => isTicketScratched(t)).length}
                </div>
                <div className="text-xs text-gray-400">
                  Raspados <span className="text-green-400">(Sync)</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm border-gray-700">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {tickets.filter(t => t.is_winner).length}
                </div>
                <div className="text-xs text-gray-400">
                  Ganadores
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Activos: {tickets.filter(t => t.is_winner && isTicketScratched(t)).length}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/10 backdrop-blur-sm border-gray-700">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.claimed}</div>
                <div className="text-xs text-gray-400">Entregados</div>
              </div>
            </div>
          </Card>

          {/* Сумма выплачена */}
          <Card className="p-4 bg-white/10 backdrop-blur-sm border-gray-700">
            <div className="flex items-center gap-3">
              <Banknote className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-lg font-bold text-green-400">
                  {InstantTicketUtils.formatPrizeAmount(
                    tickets
                      .filter(t => t.is_winner && isTicketScratched(t) && t.is_claimed)
                      .reduce((sum, t) => sum + parseFloat(t.prize_amount.toString()), 0)
                  )}
                </div>
                <div className="text-xs text-gray-400">Pagado</div>
              </div>
            </div>
          </Card>

          {/* Сумма к выплате */}
          <Card className="p-4 bg-white/10 backdrop-blur-sm border-gray-700">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-400" />
              <div>
                <div className="text-lg font-bold text-orange-400">
                  {InstantTicketUtils.formatPrizeAmount(
                    tickets
                      .filter(t => t.is_winner && isTicketScratched(t) && !t.is_claimed)
                      .reduce((sum, t) => sum + parseFloat(t.prize_amount.toString()), 0)
                  )}
                </div>
                <div className="text-xs text-gray-400">Pendiente</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Botón limpiar filtros y contador */}
      <div className="flex items-center justify-between mb-4">
        {(searchQuery || selectedDrawId) && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedDrawId(null)
            }}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilters({ limit: 50 })}
          className={`border-2 transition-all ${
            Object.keys(filters).length === 1 && filters.limit === 50
              ? 'bg-gray-600 border-gray-400 text-white' 
              : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Todos ({groupedTickets?.reduce((total, group) => total + group.tickets.length, 0) || 0})
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilters({ 
            is_scratched: false, 
            limit: 50 
          })}
          className={`border-2 transition-all ${
            filters.is_scratched === false && filters.is_winner === undefined && filters.is_claimed === undefined
              ? 'bg-blue-600 border-blue-400 text-white' 
              : 'bg-blue-800 border-blue-600 text-blue-300 hover:bg-blue-700'
          }`}
        >
          Sin raspar ({groupedTickets?.reduce((total, group) => total + group.tickets.filter(t => !isTicketScratched(t)).length, 0) || 0})
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilters({ 
            is_scratched: true,
            limit: 50 
          })}
          className={`border-2 transition-all ${
            filters.is_scratched === true && filters.is_winner === undefined && filters.is_claimed === undefined
              ? 'bg-yellow-600 border-yellow-400 text-white' 
              : 'bg-yellow-800 border-yellow-600 text-yellow-300 hover:bg-yellow-700'
          }`}
        >
          Raspados ({groupedTickets?.reduce((total, group) => total + group.tickets.filter(t => isTicketScratched(t) && !t.is_winner).length, 0) || 0})
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilters({ 
            is_winner: true,
            is_claimed: false,
            limit: 50 
          })}
          className={`border-2 transition-all ${
            filters.is_winner === true && filters.is_claimed === false && filters.is_scratched === undefined
              ? 'bg-orange-600 border-orange-400 text-white' 
              : 'bg-orange-800 border-orange-600 text-orange-300 hover:bg-orange-700'
          }`}
        >
          Pendientes de entregar ({groupedTickets?.reduce((total, group) => total + group.tickets.filter(t => t.is_winner && isTicketScratched(t) && !t.is_claimed).length, 0) || 0})
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilters({ 
            is_winner: true,
            is_claimed: true,
            limit: 50 
          })}
          className={`border-2 transition-all ${
            filters.is_winner === true && filters.is_claimed === true && filters.is_scratched === undefined
              ? 'bg-green-600 border-green-400 text-white' 
              : 'bg-green-800 border-green-600 text-green-300 hover:bg-green-700'
          }`}
        >
          Entregados ({groupedTickets?.reduce((total, group) => total + group.tickets.filter(t => t.is_winner && isTicketScratched(t) && t.is_claimed).length, 0) || 0})
        </Button>
      </div>

      {/* Lista de billetes */}
      <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Billetes Instantáneos ({groupedTickets?.reduce((total, group) => total + group.tickets.length, 0) || 0})
          </h3>
          <div className="text-sm text-gray-400">
            Última actualización: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {ticketsLoading || groupedLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="text-white ml-3">Cargando billetes...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-400">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>Error al cargar los billetes</span>
          </div>
        ) : !filteredGroupedTickets || filteredGroupedTickets.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{searchQuery || selectedDrawId ? 'No se encontraron billetes' : 'No hay billetes instantáneos'}</p>
            {(searchQuery || selectedDrawId) && (
              <p className="text-sm mt-2">Intenta con otros términos de búsqueda</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Información de resultados */}
            <div className="text-sm text-gray-400 flex items-center justify-between">
              <div>
                {searchQuery || selectedDrawId ? (
                  <>
                    Mostrando {filteredGroupedTickets.reduce((total, group) => total + group.tickets.length, 0)} billetes 
                    en {filteredGroupedTickets.length} sorteos
                  </>
                ) : (
                  <>
                    Total: {groupedTickets?.reduce((total, group) => total + group.tickets.length, 0) || 0} billetes 
                    en {groupedTickets?.length || 0} sorteos
                  </>
                )}
                {searchQuery && (
                  <span className="ml-2 text-purple-400">
                    • Búsqueda: "{searchQuery}"
                  </span>
                )}
                {(filters.is_scratched !== undefined || filters.is_winner !== undefined || filters.is_claimed !== undefined) && (
                  <span className="ml-2 text-yellow-400">
                    • Filtrado
                  </span>
                )}
              </div>
              <div className="text-xs">
                Sincronización: {forceUpdate % 2 === 0 ? '🟢' : '🔄'} LocalStorage + BD
              </div>
            </div>
            
            {filteredGroupedTickets.map((group) => (
              <motion.div
                key={group.draw_id || 'no-draw'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden"
              >
                {/* Заголовок группы - информация о розыгрыше */}
                <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-gray-700 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-purple-400" />
                      <div>
                        <h3 className="text-lg font-bold text-white">{group.draw_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          {group.draw_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(group.draw_date)}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.draw_status === 'finished' ? 'bg-green-500/20 text-green-300' :
                            group.draw_status === 'active' ? 'bg-orange-500/20 text-orange-300' :
                            group.draw_status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {group.draw_status === 'finished' ? 'Finalizado' :
                             group.draw_status === 'active' ? 'Activo' : 'Cancelado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">
                        {group.tickets.length}
                      </div>
                      <div className="text-sm text-gray-300">
                        {group.tickets.length === 1 ? 'billete' : 'billetes'}
                        {searchQuery && (
                          <div className="text-xs text-gray-400 mt-1">
                            encontrados
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Información del ganador si existe */}
                  {group.winner_number && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-green-300">
                        <Trophy className="w-4 h-4" />
                        <span className="font-medium">Ganador: #{group.winner_number}</span>
                        {group.winner_name && <span>- {group.winner_name}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de билетов для этого розыгрыша */}
                <div className="p-4 space-y-3">
                  {group.tickets.map((ticket) => {
              // Получаем статус с учетом localStorage
              const isReallyScratched = isTicketScratched(ticket)
              const ticketStatus = InstantTicketUtils.getTicketStatus({
                ...ticket,
                is_scratched: isReallyScratched // Используем гибридный статус
              })
              const application = ticket.applications
              
              return (
                <motion.div
                  key={ticket.id}
                  layout
                  className={`p-4 rounded-lg border transition-all ${
                    ticket.is_winner && ticket.is_claimed
                      ? 'bg-green-800/30 border-green-500/50 shadow-md shadow-green-500/20' // Подсветка для выплаченных
                      : 'bg-gray-800/50 border-gray-600/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* Información del billete */}
                      <div>
                        <div className="font-mono text-sm text-white">#{ticket.ticket_number}</div>
                        <div className="text-xs text-gray-400">{ticket.barcode}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(ticket.created_at)}
                        </div>
                        {/* Индикатор синхронизации */}
                        {isReallyScratched && !ticket.is_scratched && (
                          <div className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                            Local raspado
                          </div>
                        )}
                      </div>

                      {/* Usuario */}
                      <div>
                        <div className="flex items-center gap-1 text-sm text-white">
                          <User className="w-3 h-3" />
                          {application?.user_name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone className="w-3 h-3" />
                          {application?.user_phone || 'N/A'}
                        </div>
                        {application?.cedula && (
                          <div className="text-xs text-gray-500 mt-1">
                            C.I: {application.cedula}
                          </div>
                        )}
                      </div>

                      {/* Números de Lotería */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Números elegidos:</div>
                        <div className="flex flex-wrap gap-1">
                          {application?.numbers?.map((number, index) => (
                            <Badge 
                              key={index}
                              variant="outline" 
                              className="text-xs px-1 py-0 bg-blue-500/20 text-blue-300 border-blue-400"
                            >
                              {number}
                            </Badge>
                          )) || (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </div>
                        {application?.numbers && (
                          <div className="text-xs text-gray-500 mt-1">
                            Total: {application.numbers.length} números
                          </div>
                        )}
                      </div>

                      {/* Estado */}
                      <div>
                        {/* Главный badge состояния */}
                        {ticket.is_winner && isReallyScratched && ticket.is_claimed ? (
                          <Badge className="bg-green-600 text-white border-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Entregado
                          </Badge>
                        ) : ticket.is_winner && isReallyScratched && !ticket.is_claimed ? (
                          <Badge className="bg-orange-600 text-white border-orange-500">
                            <Clock className="w-3 h-3 mr-1" />
                            Ganador - No reclamado
                          </Badge>
                        ) : ticket.is_winner && !isReallyScratched ? (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                            <Trophy className="w-3 h-3 mr-1" />
                            Ganador - Sin raspar
                          </Badge>
                        ) : isReallyScratched ? (
                          <Badge variant="outline" className="text-gray-400 border-gray-500">
                            <Gift className="w-3 h-3 mr-1" />
                            Raspado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-400 border-blue-500">
                            <Ticket className="w-3 h-3 mr-1" />
                            Sin raspar
                          </Badge>
                        )}
                        
                        {/* Сумма приза для выигрышных */}
                        {ticket.is_winner && (
                          <div className="text-sm font-bold text-yellow-400 mt-1">
                            {InstantTicketUtils.formatPrizeAmount(ticket.prize_amount)}
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center justify-center">
                        {/* Кнопки для выигрышных билетов */}
                        {(() => {
                          const shouldShowButton = ticket.is_winner && isReallyScratched && !ticket.is_claimed
                          
                          // Логирование для отладки
                          if (ticket.is_winner) {
                            console.log(`🎯 Кнопка для билета ${ticket.ticket_number}:`, {
                              is_winner: ticket.is_winner,
                              isReallyScratched: isReallyScratched,
                              is_claimed: ticket.is_claimed,
                              shouldShowButton: shouldShowButton,
                              isPending: claimPrizeMutation.isPending
                            })
                          }
                          
                          // Показываем кнопку только если билет стерт и является выигрышным
                          if (shouldShowButton) {
                            return (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    console.log('🔥 Кнопка Entregado нажата для билета:', ticket.id, ticket.ticket_number)
                                    handleClaimPrize(ticket.id)
                                  }}
                                  disabled={claimPrizeMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-xs"
                                >
                                  <Banknote className="w-4 h-4 mr-1" />
                                  {claimPrizeMutation.isPending ? 'Procesando...' : 'Entregado'}
                                </Button>
                              </div>
                            )
                          }
                          
                          return null
                        })()}
                        
                        {ticket.is_winner && isReallyScratched && ticket.is_claimed ? (
                          /* Зеленый кружок с галочкой для выплаченных */
                          <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-full">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        ) : ticket.is_winner && isReallyScratched && !ticket.is_claimed ? (
                          /* Оранжевый кружок с часами для готовых к выплате */
                          <div className="flex items-center justify-center w-10 h-10 bg-orange-600/20 border-2 border-orange-600 rounded-full">
                            <Clock className="w-5 h-5 text-orange-400" />
                          </div>
                        ) : ticket.is_winner && !isReallyScratched ? (
                          /* Иконка ожидания для выигрышных нестертых */
                          <div className="flex items-center justify-center w-10 h-10 bg-yellow-600/20 border-2 border-yellow-600 rounded-full">
                            <Clock className="w-5 h-5 text-yellow-400" />
                          </div>
                        ) : (
                          /* Пустое место для остальных */
                          <div className="w-10 h-10"></div>
                        )}
                      </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default InstantTicketsAdmin