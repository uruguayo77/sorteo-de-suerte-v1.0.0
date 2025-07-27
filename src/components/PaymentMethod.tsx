import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, NumberReservation, Winner, Application, CreateApplicationData, UpdateApplicationData } from '@/lib/supabase';

interface PaymentMethodProps {
  onMethodSelect: (method: 'pago-movil' | 'binance' | 'bybit') => void;
}

const PaymentMethod = ({ onMethodSelect }: PaymentMethodProps) => {
  const paymentMethods = [
    {
      id: 'pago-movil' as const,
      title: 'Pago Móvil',
      description: 'Paga desde tu banco móvil',
      icon: 'pago-movil-icon',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600'
    },
    {
      id: 'binance' as const,
      title: 'Binance USDT',
      description: 'Paga con USDT en Binance',
      icon: 'bitcoin-icon',
      color: 'bg-gradient-to-br from-yellow-500 to-orange-500'
    },
    // Временно скрыто по запросу
    // {
    //   id: 'bybit' as const,
    //   title: 'ByBit USDT',
    //   description: 'Paga con USDT en ByBit',
    //   icon: 'bybit-icon',
    //   color: 'bg-gradient-to-br from-purple-500 to-pink-500'
    // }
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
                   <div className={`mx-auto w-20 h-20 ${method.icon === 'bitcoin-icon' || method.icon === 'pago-movil-icon' ? '' : method.color} rounded-full flex items-center justify-center text-3xl text-white mb-4 group-hover:scale-110 transition-transform duration-300 ${method.icon === 'bitcoin-icon' || method.icon === 'pago-movil-icon' ? '' : 'shadow-lg'}`}>
                     {method.icon === 'bitcoin-icon' ? (
                       <img 
                         src="https://i.ibb.co/DPYvT5Rm/Radius-20250724-024334-0000.png" 
                         alt="Bitcoin" 
                         className="w-36 h-36 object-contain"
                       />
                     ) : method.icon === 'pago-movil-icon' ? (
                       <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                         <g clipPath="url(#clip0_4418_3437)">
                           <path d="M2 9V6.5C2 4.01 4.01 2 6.5 2H9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           <path d="M15 2H17.5C19.99 2 22 4.01 22 6.5V9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           <path d="M22 16V17.5C22 19.99 19.99 22 17.5 22H16" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           <path d="M9 22H6.5C4.01 22 2 19.99 2 17.5V15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           <path d="M11 8.5C11 9.88 9.88 11 8.5 11C7.12 11 6 9.88 6 8.5C6 7.12 7.12 6 8.5 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           <path d="M7.5 18C8.32843 18 9 17.3284 9 16.5C9 15.6716 8.32843 15 7.5 15C6.67157 15 6 15.6716 6 16.5C6 17.3284 6.67157 18 7.5 18Z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           <path d="M16.5 9C17.3284 9 18 8.32843 18 7.5C18 6.67157 17.3284 6 16.5 6C15.6716 6 15 6.67157 15 7.5C15 8.32843 15.6716 9 16.5 9Z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                           <path d="M13 15.5C13 14.81 13.28 14.18 13.73 13.73C14.18 13.28 14.81 13 15.5 13C16.88 13 18 14.12 18 15.5C18 16.88 16.88 18 15.5 18" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                         </g>
                         <defs>
                           <clipPath id="clip0_4418_3437">
                             <rect width="24" height="24" fill="white"/>
                           </clipPath>
                         </defs>
                       </svg>
                     ) : (
                       method.icon
                     )}
                   </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 text-center">
                    {method.title}
                  </h3>
                  <p className="text-gray-300 mb-6 text-sm sm:text-base text-center min-h-[2.5rem] flex items-center justify-center">
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