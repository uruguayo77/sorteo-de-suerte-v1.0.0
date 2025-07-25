import React, { useState, useEffect } from 'react';
import { useLotteryStore, LotteryHistory as LotteryHistoryType } from '../lib/lotteryStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Calendar, Clock, Trophy, Users, XCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const LotteryHistory: React.FC = () => {
  const { getHistory, clearHistory, deleteHistoryEntry, loadHistory, isHistoryLoading } = useLotteryStore();
  const [selectedLottery, setSelectedLottery] = useState<LotteryHistoryType | null>(null);
  
  const history = getHistory();

  // Загружаем историю при монтировании компонента
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Форматирование даты
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматирование длительности
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Получение статуса
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { 
          text: 'Completado', 
          color: 'bg-green-500',
          icon: Trophy 
        };
      case 'cancelled':
        return { 
          text: 'Cancelado', 
          color: 'bg-red-500',
          icon: XCircle 
        };
      case 'no_winner':
        return { 
          text: 'Sin Ganador', 
          color: 'bg-orange-500',
          icon: AlertCircle 
        };
      default:
        return { 
          text: status, 
          color: 'bg-gray-500',
          icon: Clock 
        };
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      toast({
        title: "Historia eliminada",
        description: "Todos los registros de sorteos han sido eliminados"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la historia",
        variant: "destructive"
      });
    }
  };

  if (isHistoryLoading) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300 text-lg mb-2">Cargando historial...</p>
            <p className="text-gray-400 text-sm">Sincronizando con la base de datos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No hay sorteos en el historial</p>
            <p className="text-gray-400 text-sm">Los sorteos completados aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de limpiar */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Historial de Sorteos</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Historial
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar historial?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente todos los registros de sorteos. ¿Estás seguro?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearHistory}>
                Eliminar Todo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Lista de sorteos */}
      <div className="space-y-4">
        {history.map((lottery) => {
          const statusConfig = getStatusConfig(lottery.status);
          const StatusIcon = statusConfig.icon;

          return (
            <Card key={lottery.id} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Información principal */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          #{lottery.lotteryNumber}
                        </Badge>
                        <h4 className="text-lg font-semibold text-white">{lottery.name}</h4>
                      </div>
                      <Badge className={`${statusConfig.color} text-white flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.text}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Trophy className="w-4 h-4 text-purple-400" />
                        <span>Premio: {lottery.prizeAmount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>{formatDate(lottery.endTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="w-4 h-4 text-green-400" />
                        <span>Duró: {formatDuration(lottery.actualDuration)}</span>
                      </div>
                      {lottery.winnerNumber && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span className="font-bold text-yellow-400">Ganador: #{lottery.winnerNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón de ver detalles */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedLottery(lottery)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <StatusIcon className="w-5 h-5" />
                          <Badge variant="secondary" className="text-xs">
                            #{lottery.lotteryNumber}
                          </Badge>
                          {lottery.name}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Estado y resultado */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-400">Estado</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${statusConfig.color} text-white`}>
                                {statusConfig.text}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-400">Premio</label>
                            <p className="text-lg font-semibold text-white mt-1">{lottery.prizeAmount}</p>
                          </div>
                        </div>

                        {/* Ganador */}
                        {lottery.winnerNumber ? (
                          <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <Trophy className="w-8 h-8 text-yellow-400" />
                              <div>
                                <h3 className="text-xl font-bold text-green-400">¡Ganador!</h3>
                                <p className="text-3xl font-bold text-yellow-400">Número #{lottery.winnerNumber}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-orange-600/20 border border-orange-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <AlertCircle className="w-8 h-8 text-orange-400" />
                              <div>
                                <h3 className="text-lg font-semibold text-orange-400">Sin Ganador</h3>
                                <p className="text-gray-300">{lottery.reason || 'No se determinó un ganador'}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Información de tiempo */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-400">Fecha de Inicio</label>
                            <p className="text-white mt-1">{formatDate(lottery.startTime)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-400">Fecha de Fin</label>
                            <p className="text-white mt-1">{formatDate(lottery.endTime)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-400">Duración Planeada</label>
                            <p className="text-white mt-1">{formatDuration(lottery.plannedDuration)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-400">Duración Real</label>
                            <p className="text-white mt-1">{formatDuration(lottery.actualDuration)}</p>
                          </div>
                        </div>

                        {/* Participación */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-400">Total Participantes</label>
                            <p className="text-white mt-1 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {lottery.totalParticipants || 'No disponible'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-400">Números Participantes</label>
                            <div className="mt-1">
                              {lottery.participantNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {lottery.participantNumbers.slice(0, 10).map(num => (
                                    <span key={num} className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                                      #{num}
                                    </span>
                                  ))}
                                  {lottery.participantNumbers.length > 10 && (
                                    <span className="text-gray-400 text-xs">
                                      +{lottery.participantNumbers.length - 10} más
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-sm">No disponible</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Razón (si existe) */}
                        {lottery.reason && (
                          <div>
                            <label className="text-sm font-medium text-gray-400">Observaciones</label>
                            <p className="text-white mt-1 bg-gray-800/50 rounded-lg p-3">{lottery.reason}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LotteryHistory; 