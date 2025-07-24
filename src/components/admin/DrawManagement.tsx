import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAllDraws, useCreateDraw, useSetWinner, LotteryDraw, getDrawStatusText, getDrawStatusColor } from '@/hooks/use-lottery-draw'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { toast } from 'sonner'
import { Plus, Trophy, Calendar, Clock, DollarSign, User, Hash, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DrawManagement = () => {
  const { data: draws, isLoading } = useAllDraws()
  const createDraw = useCreateDraw()
  const setWinner = useSetWinner()
  const { adminUser } = useAdminAuth()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showWinnerForm, setShowWinnerForm] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Form states
  const [newDraw, setNewDraw] = useState({
    draw_name: '',
    draw_date: '',
    prize_amount: 500
  })
  
  const [winnerData, setWinnerData] = useState({
    winner_number: ''
  })

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!adminUser?.id) {
      toast.error('Error de autenticación')
      return
    }

    try {
      await createDraw.mutateAsync({
        draw_name: newDraw.draw_name,
        draw_date: newDraw.draw_date,
        prize_amount: newDraw.prize_amount,
        created_by: adminUser.id
      })

      toast.success('Sorteo creado exitosamente')
      setShowCreateForm(false)
      setNewDraw({ draw_name: '', draw_date: '', prize_amount: 500 })
    } catch (error) {
      console.error('Error creating draw:', error)
      toast.error('Error al crear el sorteo')
    }
  }

  const handleSetWinner = async (drawId: string) => {
    if (!adminUser?.id) {
      toast.error('Error de autenticación')
      return
    }

    const winnerNumber = parseInt(winnerData.winner_number)
    if (!winnerNumber || winnerNumber < 1 || winnerNumber > 100) {
      toast.error('Número de ganador inválido (1-100)')
      return
    }

    try {
      await setWinner.mutateAsync({
        drawId,
        winnerNumber,
        adminId: adminUser.id
      })

      toast.success('Ganador establecido exitosamente')
      setShowWinnerForm(null)
      setWinnerData({ winner_number: '' })
    } catch (error) {
      console.error('Error setting winner:', error)
      toast.error('Error al establecer ganador')
    }
  }

  // Удаление розыгрыша
  const handleDeleteDraw = async (drawId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este sorteo?')) return
    setDeletingId(drawId)
    try {
      const { error } = await supabase.from('lottery_draws').delete().eq('id', drawId)
      if (error) throw error
      toast.success('Sorteo eliminado')
    } catch (error) {
      toast.error('Error al eliminar sorteo')
    } finally {
      setDeletingId(null)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Gestión de Sorteos
          </h2>
          <p className="text-gray-300 mt-1">Crear y administrar sorteos de la lotería</p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white border-0 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Sorteo
        </Button>
      </div>

      {/* Create Draw Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Crear Nuevo Sorteo</h3>
          
          <form onSubmit={handleCreateDraw} className="space-y-4">
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
              </div>
              
              <div>
                <Label htmlFor="prize_amount" className="text-white">Premio (USD)</Label>
                <Input
                  id="prize_amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={newDraw.prize_amount}
                  onChange={(e) => setNewDraw({ ...newDraw, prize_amount: parseFloat(e.target.value) })}
                  className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="draw_date" className="text-white">Fecha y Hora del Sorteo</Label>
              <Input
                id="draw_date"
                type="datetime-local"
                value={newDraw.draw_date}
                onChange={(e) => setNewDraw({ ...newDraw, draw_date: e.target.value })}
                className="bg-white/5 border-gray-600 text-white"
                required
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createDraw.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              >
                {createDraw.isPending ? 'Creando...' : 'Crear Sorteo'}
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Draws List */}
      <div className="grid gap-6">
        {draws && draws.length > 0 ? (
          draws.map((draw) => (
            <motion.div
              key={draw.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:bg-white/15 transition-all duration-200"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Draw info */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{draw.draw_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDrawStatusColor(draw.status)}`}>
                      {getDrawStatusText(draw.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(draw.draw_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <DollarSign className="w-4 h-4" />
                      <span>${draw.prize_amount} USD</span>
                    </div>
                    {draw.winner_number && (
                      <>
                        <div className="flex items-center gap-2 text-green-300">
                          <Hash className="w-4 h-4" />
                          <span>Ganador: #{draw.winner_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-300">
                          <User className="w-4 h-4" />
                          <span>{draw.winner_name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {draw.status === 'active' && !draw.winner_number && (
                  <div className="lg:w-48">
                    {showWinnerForm === draw.id ? (
                      <div className="space-y-3">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={winnerData.winner_number}
                          onChange={(e) => setWinnerData({ winner_number: e.target.value })}
                          className="bg-white/5 border-gray-600 text-white"
                          placeholder="Número ganador (1-100)"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowWinnerForm(null)}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => handleSetWinner(draw.id)}
                            disabled={setWinner.isPending}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setShowWinnerForm(draw.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white border-0 flex items-center gap-2"
                      >
                        <Trophy className="w-4 h-4" />
                        Establecer Ganador
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  onClick={() => handleDeleteDraw(draw.id)}
                  disabled={deletingId === draw.id}
                  size="sm"
                  variant="outline"
                  className="mt-2 border-red-500 text-red-400 hover:bg-red-500/10 w-full flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId === draw.id ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 max-w-md mx-auto">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg mb-2">No hay sorteos</p>
              <p className="text-gray-400 text-sm">Crea tu primer sorteo para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DrawManagement 