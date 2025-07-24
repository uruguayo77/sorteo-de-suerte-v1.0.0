import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentMethodProps {
  onMethodSelect: (method: 'pago-movil' | 'binance' | 'bybit') => void;
}

const PaymentMethod = ({ onMethodSelect }: PaymentMethodProps) => {
  const paymentMethods = [
    {
      id: 'pago-movil' as const,
      title: 'Pago Móvil',
      description: 'Transfiere desde tu banco móvil',
      icon: '📱',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600'
    },
    {
      id: 'binance' as const,
      title: 'Binance USDT',
      description: 'Paga con USDT en Binance',
      icon: '₿',
      color: 'bg-gradient-to-br from-yellow-500 to-orange-500'
    },
    {
      id: 'bybit' as const,
      title: 'ByBit USDT',
      description: 'Paga con USDT en ByBit',
      icon: '💱',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Selecciona tu Método de Pago
        </h2>
        <p className="text-muted-foreground">
          Elige la forma más conveniente para ti
        </p>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {paymentMethods.map((method) => (
          <Card 
            key={method.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden group"
            onClick={() => onMethodSelect(method.id)}
          >
            <CardHeader className="text-center pb-4">
              <div className={`mx-auto w-16 h-16 ${method.color} rounded-full flex items-center justify-center text-2xl text-white mb-3 group-hover:scale-110 transition-transform duration-200`}>
                {method.icon}
              </div>
              <CardTitle className="text-lg">{method.title}</CardTitle>
              <CardDescription className="text-sm">
                {method.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                variant="gradient" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onMethodSelect(method.id);
                }}
              >
                Seleccionar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethod;