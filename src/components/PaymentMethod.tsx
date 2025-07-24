import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, NumberReservation, Winner, Application, CreateApplicationData, UpdateApplicationData } from '@/lib/supabase'
import { useBlockedNumbers } from "@/hooks/use-supabase";

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
      icon: 'bitcoin-icon',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Abstract background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent mb-4">
              Selecciona tu Método de Pago
            </h2>
            <p className="text-lg sm:text-xl text-gray-300">
              Elige la forma más conveniente para ti
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3 max-w-5xl mx-auto">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 cursor-pointer hover:bg-white/15 transition-all duration-300 group hover:scale-105 hover:shadow-2xl"
                onClick={() => onMethodSelect(method.id)}
              >
                                 <div className="text-center">
                   <div className={`mx-auto w-20 h-20 ${method.icon === 'bitcoin-icon' ? '' : method.color} rounded-full flex items-center justify-center text-3xl text-white mb-4 group-hover:scale-110 transition-transform duration-300 ${method.icon === 'bitcoin-icon' ? '' : 'shadow-lg'}`}>
                     {method.icon === 'bitcoin-icon' ? (
                       <img 
                         src="https://i.ibb.co/DPYvT5Rm/Radius-20250724-024334-0000.png" 
                         alt="Bitcoin" 
                         className="w-16 h-16 object-contain"
                       />
                     ) : (
                       method.icon
                     )}
                   </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {method.title}
                  </h3>
                  <p className="text-gray-300 mb-6 text-sm sm:text-base">
                    {method.description}
                  </p>
                  <Button 
                    variant="gradient" 
                    className="w-full text-base sm:text-lg py-3 sm:py-4 font-semibold shadow-xl hover:scale-105 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMethodSelect(method.id);
                    }}
                  >
                    Seleccionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;