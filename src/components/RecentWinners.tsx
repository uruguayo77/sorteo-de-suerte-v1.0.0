import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWinners } from "@/hooks/use-supabase";
import { Loader2, Trophy, Calendar } from "lucide-react";

const RecentWinners = () => {
  const { data: winners, isLoading, error } = useWinners();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando ganadores...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-destructive">Error al cargar ganadores</p>
        </div>
      </Card>
    );
  }

  const recentWinners = winners?.slice(0, 5) || [];

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Últimos Ganadores
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentWinners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay ganadores aún</p>
            <p className="text-sm">¡Sé el primero en ganar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentWinners.map((winner) => (
              <div
                key={winner.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                    #{winner.number}
                  </div>
                  <div>
                    <p className="font-semibold">{winner.user_name}</p>
                    <p className="text-sm text-muted-foreground">{winner.user_phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{winner.prize_amount}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(winner.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentWinners; 