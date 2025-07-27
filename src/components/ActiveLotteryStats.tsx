import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useActiveLotteryStats, useAutoFinishLottery, useActiveLotteryDraw } from "@/hooks/use-supabase";
import { useBlockAllNumbers } from "@/hooks/use-block-all-numbers";
import { Loader2, Hash, Users, AlertTriangle, Trophy, CheckCircle, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ActiveLotteryStats = () => {
  const { data: stats, isLoading: statsLoading } = useActiveLotteryStats();
  const { data: activeLottery } = useActiveLotteryDraw();
  const autoFinishLottery = useAutoFinishLottery();
  const blockAllNumbers = useBlockAllNumbers();
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [winnerNumber, setWinnerNumber] = useState<string>('');
  const { toast } = useToast();

  // Автозавершение когда все номера проданы
  useEffect(() => {
    if (stats?.allNumbersSold && activeLottery?.status === 'active') {
      console.log('Все номера проданы! Требуется завершение розыгрыша.');
      toast({
        title: "¡Todos los números vendidos!",
        description: "El sorteo está listo para finalizar. Selecciona el número ganador.",
        variant: "default",
      });
    }
  }, [stats?.allNumbersSold, activeLottery?.status, toast]);

  const handleFinishLottery = async () => {
    const winner = parseInt(winnerNumber);
    
    if (!winner || winner < 1 || winner > (stats?.totalNumbers || 100)) {
      toast({
        title: "Error",
        description: `El número ganador debe estar entre 1 y ${stats?.totalNumbers || 100}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await autoFinishLottery.mutateAsync(winner);
      toast({
        title: "¡Sorteo finalizado!",
        description: `El número ganador es: ${winner}`,
        variant: "default",
      });
      setIsFinishDialogOpen(false);
      setWinnerNumber('');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo finalizar el sorteo",
        variant: "destructive",
      });
    }
  };

  const handleTestBlockAll = async () => {
    if (window.confirm('¿Estás seguro de que quieres bloquear TODOS los números? Esta acción es para testing únicamente.')) {
      try {
        console.log('🧪 Iniciando test de bloqueo masivo...');
        await blockAllNumbers.mutateAsync();
        console.log('✅ Test de bloqueo completado');
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || "Error desconocido";
        console.error('❌ Error en test de bloqueo:', errorMessage);
        console.error('❌ Error completo:', error);
      }
    }
  };

  if (statsLoading) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="ml-2 text-purple-700">Cargando estadísticas del sorteo...</span>
        </div>
      </Card>
    );
  }

  if (!stats || !activeLottery) {
    return null;
  }

  const isActive = activeLottery.status === 'active';

  return (
    <div className="space-y-6">
      {/* Estadísticas de números */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Números Disponibles
            </CardTitle>
            <div className="p-2 bg-blue-200 rounded-full">
              <Hash className="h-4 w-4 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-1">
              {stats.availableNumbers}
            </div>
            <p className="text-xs text-blue-700">
              de {stats.totalNumbers} totales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Números Vendidos
            </CardTitle>
            <div className="p-2 bg-purple-200 rounded-full">
              <Users className="h-4 w-4 text-purple-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-1">
              {stats.blockedNumbers}
            </div>
            <p className="text-xs text-purple-700">
              {stats.soldPercentage}% vendido
            </p>
          </CardContent>
        </Card>

        <Card className={`shadow-lg hover:shadow-xl transition-all duration-300 ${
          stats.allNumbersSold 
            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300' 
            : 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${
              stats.allNumbersSold ? 'text-red-800' : 'text-green-800'
            }`}>
              Estado del Sorteo
            </CardTitle>
            <div className={`p-2 rounded-full ${
              stats.allNumbersSold ? 'bg-red-200' : 'bg-green-200'
            }`}>
              {stats.allNumbersSold ? 
                <AlertTriangle className="h-4 w-4 text-red-700" /> : 
                <CheckCircle className="h-4 w-4 text-green-700" />
              }
            </div>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={stats.allNumbersSold ? "destructive" : "default"}
              className={`text-sm font-medium ${
                stats.allNumbersSold 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {stats.allNumbersSold ? "Listo para finalizar" : "En progreso"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-indigo-800">Progreso de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-6 mb-3 overflow-hidden shadow-inner">
            <div 
              className={`h-6 rounded-full transition-all duration-1000 ease-out relative ${
                stats.soldPercentage === 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                stats.soldPercentage >= 80 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                'bg-gradient-to-r from-purple-500 to-indigo-600'
              }`}
              style={{ width: `${stats.soldPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-indigo-700 font-medium">
            <span>0</span>
            <span className="font-bold text-indigo-800">{stats.soldPercentage}%</span>
            <span>{stats.totalNumbers}</span>
          </div>
        </CardContent>
      </Card>

      {/* Botón de test */}
      <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-lg">
        <CardHeader>
          <CardTitle className="text-yellow-800 flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Testing - Solo para Administradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 mb-4 text-sm">
            Usa este botón para bloquear todos los números y probar el sistema de finalización automática.
          </p>
                    <Button
            onClick={handleTestBlockAll}
            disabled={blockAllNumbers.isPending}
            variant="outline"
            className="w-full border-yellow-400 text-yellow-800 hover:bg-yellow-100 rounded-xl"
          >
            {blockAllNumbers.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bloqueando números...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Bloquear Todos los Números (Test)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Botón de finalización (solo si todos los números están vendidos y hay sorteo activo) */}
      {stats.allNumbersSold && isActive && (
        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 shadow-lg">
          <CardHeader>
            <CardTitle className="text-emerald-800 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Sorteo Listo para Finalizar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-emerald-700 mb-4">
              Todos los números han sido vendidos. Puedes finalizar el sorteo seleccionando el número ganador.
            </p>
            
            <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg rounded-xl"
                  size="lg"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Finalizar Sorteo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-green-50 to-emerald-50">
                <DialogHeader>
                  <DialogTitle className="text-emerald-800">Finalizar Sorteo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-emerald-700">
                    Selecciona el número ganador del sorteo "{activeLottery.draw_name}":
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-emerald-800">Número Ganador</label>
                    <Input
                      type="number"
                      min="1"
                      max={stats.totalNumbers}
                      value={winnerNumber}
                      onChange={(e) => setWinnerNumber(e.target.value)}
                      placeholder={`Número entre 1 y ${stats.totalNumbers}`}
                      className="w-full border-emerald-300 focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsFinishDialogOpen(false)}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleFinishLottery}
                      disabled={autoFinishLottery.isPending}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-xl"
                    >
                      {autoFinishLottery.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Finalizando...
                        </>
                      ) : (
                        <>
                          <Trophy className="h-4 w-4 mr-2" />
                          Finalizar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ActiveLotteryStats; 