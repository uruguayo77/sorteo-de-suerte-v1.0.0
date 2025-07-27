import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useApplications, useApplicationsGroupedByDraw, useUpdateApplication } from '@/hooks/use-supabase'
import { useScheduledDrawAutostart } from '@/hooks/use-scheduled-draws'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { Application } from '@/lib/supabase'
import { toast } from 'sonner'
import { Check, X, Clock, User, Phone, CreditCard, Image as ImageIcon, Calendar, FileText, LogOut, ArrowLeft, Users, Trophy, Search, Filter, Monitor } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { AdminLotteryPanel } from '@/components/AdminLotteryPanel'
import OnboardingAdmin from '@/components/admin/OnboardingAdmin'

const Admin = () => {
  const { data: applications, isLoading: applicationsLoading, error } = useApplications()
  const { data: groupedApplications, isLoading: groupedLoading } = useApplicationsGroupedByDraw()
  const { isAuthenticated, isLoading: authLoading, logout, getAdminEmail } = useAdminAuth()
  const updateApplication = useUpdateApplication()
  
  // Автоматический запуск отложенных розыгрышей
  useScheduledDrawAutostart()
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'applications' | 'draws' | 'onboarding'>('applications')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada exitosamente')
    navigate('/admin/login')
  }

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await updateApplication.mutateAsync({
        id,
        updates: {
          status,
          admin_notes: notes || undefined,
          updated_at: new Date().toISOString()
        }
      })
      
      const statusText = status === 'approved' ? 'aprobada' : 'rechazada'
      toast.success(`Solicitud ${statusText} exitosamente`)
      setSelectedApplication(null)
      setAdminNotes('')
    } catch (error) {
      console.error('Error updating application:', error)
      toast.error('Error al actualizar la solicitud')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'approved':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'rejected':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'approved':
        return 'Aprobada'
      case 'rejected':
        return 'Rechazada'
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

  // Фильтрация заявок по поиску и выбранному розыгрышу
  const filteredGroupedApplications = groupedApplications?.filter(group => {
    // Фильтр по выбранному розыгрышу
    if (selectedDrawId && group.draw_id !== selectedDrawId) {
      return false
    }
    
    // Фильтр по поисковому запросу
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        group.draw_name.toLowerCase().includes(searchLower) ||
        group.applications.some(app => 
          app.user_name.toLowerCase().includes(searchLower) ||
          app.cedula.toLowerCase().includes(searchLower) ||
          app.user_phone.includes(searchTerm) ||
          app.numbers.some(num => num.toString().includes(searchTerm))
        )
      )
    }
    
    return true
  })

  if (authLoading || applicationsLoading || groupedLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error al cargar solicitudes</p>
          <p className="text-gray-400">Por favor, recarga la página</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Abstract background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Header with logout button */}
      <div className="relative z-10 flex justify-between items-center p-4">
        <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al inicio</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">
            {getAdminEmail()}
          </span>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white border-0 flex items-center gap-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent mb-4">
            Panel de Administración
          </h1>
          <p className="text-gray-300 text-lg">Gestiona las solicitudes y sorteos de la lotería</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-2 flex overflow-x-auto scrollbar-hide gap-1 min-w-0 max-w-full">
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Solicitudes</span>
              <span className="sm:hidden">Solicitud</span>
            </button>
            <button
              onClick={() => setActiveTab('draws')}
              className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'draws'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Sorteos
            </button>
            <button
              onClick={() => setActiveTab('onboarding')}
              className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'onboarding'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Onboarding</span>
              <span className="sm:hidden">Config</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'applications' && (
            <motion.div
              key="applications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Поиск и фильтры */}
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Поиск */}
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, cédula, teléfono, números..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Фильтр по розыгрышу */}
                  <div className="relative">
                    <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={selectedDrawId || ''}
                      onChange={(e) => setSelectedDrawId(e.target.value || null)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Todos los sorteos</option>
                      {groupedApplications?.map(group => (
                        <option key={group.draw_id || 'no-draw'} value={group.draw_id || ''}>
                          {group.draw_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Botón limpiar filtros */}
                {(searchTerm || selectedDrawId) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedDrawId(null)
                    }}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              {filteredGroupedApplications && filteredGroupedApplications.length > 0 ? (
                <div className="space-y-8">
                                     {filteredGroupedApplications.map((group) => (
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
                              {group.applications.length}
                            </div>
                            <div className="text-sm text-gray-300">
                              {group.applications.length === 1 ? 'solicitud' : 'solicitudes'}
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

                                             {/* Lista de заявок для этого розыгрыша */}
                       <div className="p-4 space-y-4">
                         {group.applications.map((application) => (
                           <div key={application.id} className="bg-white/5 border border-gray-600 rounded-xl p-4 hover:bg-white/10 transition-all duration-200">
                             <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left side - Application info */}
                  <div className="flex-1 space-y-4">
                    {/* Header with status and date */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(application.status)}`}>
                        <Clock className="w-4 h-4 inline mr-1" />
                        {getStatusText(application.status)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {formatDate(application.created_at)}
                      </span>
                    </div>

                    {/* Numbers */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white font-medium">Números:</span>
                      {application.numbers.map((number, index) => (
                        <span
                          key={number}
                          className="bg-purple-600 text-white px-3 py-1 rounded-lg font-bold text-sm"
                        >
                          {number}
                        </span>
                      ))}
                    </div>

                    {/* User details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <User className="w-4 h-4" />
                        <span className="font-medium">Nombre:</span>
                        <span className="text-white">{application.user_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="w-4 h-4" />
                        <span className="font-medium">Teléfono:</span>
                        <span className="text-white">{application.user_phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">Cédula:</span>
                        <span className="text-white">{application.cedula}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <CreditCard className="w-4 h-4" />
                        <span className="font-medium">Pago:</span>
                        <span className="text-white">{application.payment_method}</span>
                      </div>
                      {application.payment_proof_url && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <ImageIcon className="w-4 h-4" />
                          <a
                            href={application.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 underline"
                          >
                            Ver comprobante
                          </a>
                        </div>
                      )}
                    </div>

                    {application.admin_notes && (
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-gray-300 text-sm">
                          <span className="font-medium text-white">Notas del admin:</span> {application.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right side - Actions */}
                  {application.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:w-48">
                      <Button
                        onClick={() => handleUpdateStatus(application.id, 'approved')}
                        disabled={updateApplication.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white border-0 flex items-center gap-2 rounded-xl"
                      >
                        <Check className="w-4 h-4" />
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedApplication(application)
                          setAdminNotes('')
                        }}
                        disabled={updateApplication.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white border-0 flex items-center gap-2 rounded-xl"
                      >
                        <X className="w-4 h-4" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                             </div>
                           </div>
                         ))}
                       </div>
                     </motion.div>
                   ))}
                 </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 max-w-md mx-auto">
                      <Users className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                      <p className="text-gray-300 text-lg mb-2">
                        {searchTerm || selectedDrawId ? 'No se encontraron solicitudes' : 'No hay solicitudes'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {searchTerm || selectedDrawId 
                          ? 'Intenta cambiar los filtros de búsqueda.'
                          : 'Las solicitudes aparecerán aquí agrupadas por sorteo.'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'draws' && (
              <motion.div
                key="draws"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AdminLotteryPanel />
              </motion.div>
            )}

            {activeTab === 'onboarding' && (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <OnboardingAdmin />
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* Modal for rejection with notes */}
      <AnimatePresence>
        {selectedApplication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedApplication(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Rechazar Solicitud</h3>
              <p className="text-gray-300 mb-4">
                ¿Estás seguro de que quieres rechazar la solicitud de {selectedApplication.user_name}?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notas (opcional):
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
                  rows={3}
                  placeholder="Motivo del rechazo..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setSelectedApplication(null)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected', adminNotes)}
                  disabled={updateApplication.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  {updateApplication.isPending ? 'Procesando...' : 'Rechazar'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Admin 