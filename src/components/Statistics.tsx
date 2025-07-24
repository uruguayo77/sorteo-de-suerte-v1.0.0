import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStatistics } from "@/hooks/use-supabase";
import { Loader2, Users, Trophy, DollarSign, CheckCircle } from "lucide-react";

const Statistics = () => {
  const { data: stats, isLoading, error } = useStatistics();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando estadísticas...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-destructive">Error al cargar estadísticas</p>
        </div>
      </Card>
    );
  }

  const statistics = [
    {
      title: "Total Reservas",
      value: stats?.totalReservations || 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Reservas Confirmadas",
      value: stats?.confirmedReservations || 0,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Ganadores",
      value: stats?.totalWinners || 0,
      icon: Trophy,
      color: "text-yellow-600",
    },
    {
      title: "Premios Entregados",
      value: `$${stats?.totalPrizeAmount.toFixed(2) || '0.00'} USD`,
      icon: DollarSign,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statistics.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Statistics; 