import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentDraw } from "@/hooks/use-lottery-draw";
import { usePriceCalculator } from "@/hooks/use-currency";
import type { LotteryDraw } from "@/lib/supabase";

interface PaymentDetailsProps {
  method: 'pago-movil' | 'binance'; // | 'bybit' - временно скрыто
  selectedNumbers: number[];
  onContinue: () => void;
}

const PaymentDetails = ({ method, selectedNumbers, onContinue }: PaymentDetailsProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Получаем данные об активном розыгрыше и калькулятор цен
  const { data: currentDraw, isLoading: isDrawLoading } = useCurrentDraw();
  const { formatPrices, currentRate } = usePriceCalculator();
  
  // Рассчитываем общую стоимость на основе количества выбранных номеров
  const totalNumbers = selectedNumbers.length || 1; // Минимум 1 для отображения базовой цены
  
  // Получаем цены из розыгрыша или используем значения по умолчанию
  const pricePerNumberUSD = currentDraw?.number_price_usd || 1.00;
  const pricePerNumberBs = currentDraw?.number_price_bs || (currentRate ? pricePerNumberUSD * currentRate : 162.95);
  
  // Рассчитываем общие суммы
  const totalPriceUSD = Math.round(pricePerNumberUSD * totalNumbers * 100) / 100;
  const totalPriceBs = Math.round(pricePerNumberBs * totalNumbers * 100) / 100;

  const paymentData = {
    'pago-movil': {
      title: 'Pago Móvil',
      fields: [
        { label: 'Banco', value: 'Bancamiga' },
        { label: 'Teléfono', value: '04241351781' },
        { label: 'Cédula', value: 'V-28015801' },
        { label: 'Monto', value: `${totalPriceBs} Bs` }
      ],
      instructions: 'Copia los datos bancarios, realiza la transferencia desde tu app bancaria por el monto exacto y sube el comprobante en el siguiente paso.'
    },
    'binance': {
      title: 'Binance USDT',
      fields: [
        { label: 'Red', value: 'TRC20 (Tron)' },
        { label: 'Dirección', value: 'TM6yFL4oDWLrB9yBfS9gYrhhamTVfU75GT' },
        { label: 'Monto', value: `${totalPriceUSD} USDT` }
      ],
      instructions: 'Copia la dirección de la wallet, envía el monto exacto en USDT y sube el comprobante de la transacción.'
    },
    'bybit': {
      title: 'ByBit USDT',
      fields: [
        { label: 'Red', value: 'TRC20 (Tron)' },
        { label: 'Dirección', value: 'TM6yFL4oDWLrB9yBfS9gYrhhamTVfU75GT' },
        { label: 'Monto', value: `${totalPriceUSD} USDT` }
      ],
      instructions: 'Copia la dirección de la wallet, envía el monto exacto en USDT y sube el comprobante de la transacción.'
    }
  };

  const currentData = paymentData[method];

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "¡Copiado!",
        description: `${field} copiado al portapapeles`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Abstract background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent mb-4">
              Información de Pago
            </h1>
            
            {/* Индикатор загрузки цен */}
            {isDrawLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Cargando precios del sorteo...</span>
              </div>
            )}
          </div>

          {/* Selected Numbers Display */}
          <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="space-y-4 text-center">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Números Seleccionados
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedNumbers.map((num) => (
                  <span key={num} className="inline-block bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-300 font-bold text-lg sm:text-xl px-3 py-2 rounded-xl border border-purple-400/40 shadow-lg">
                    {num}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-400">
                Total: {selectedNumbers.length} número{selectedNumbers.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Основная карточка с деталями платежа */}
          <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 text-center">
              Datos para {currentData.title}
            </h3>
            <div className="space-y-4">
              {currentData.fields.map((field, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm border border-gray-600 rounded-xl p-4 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-400 block mb-1">{field.label}:</span>
                      <p className="font-bold text-white text-sm sm:text-base lg:text-lg break-all">{field.value}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(field.value, field.label)}
                      className="shrink-0 text-gray-300 hover:text-white hover:bg-white/20 mt-1"
                    >
                      {copiedField === field.label ? (
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Binance/ByBit ID блок - временно только для Binance */}
          {method === 'binance' && (
            <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6 mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 text-center">
                Binance ID
              </h3>
              <div className="bg-white/5 backdrop-blur-sm border border-gray-600 rounded-xl p-4 hover:bg-white/10 transition-all duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-400 block mb-1">Binance ID:</span>
                    <p className="font-bold text-white text-lg sm:text-xl lg:text-2xl">17575009</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('17575009', 'Binance ID')}
                    className="shrink-0 text-gray-300 hover:text-white hover:bg-white/20 mt-1"
                  >
                    {copiedField === 'Binance ID' ? (
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* QR Code секция - временно только для Binance */}
          {method === 'binance' && (
            <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6 mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 text-center">
                Escanea para Pagar Rápidamente
              </h3>
              <div className="flex justify-center">
                <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-lg">
                  <img 
                    src="https://i.ibb.co/wZRHNw6K/Screenshot-20250725-120138-Binance.jpg"
                    alt="QR Code para pago directo"
                    className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain rounded-xl"
                  />
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-300 text-center mt-4 px-2">
                Escanea este código QR desde tu app de Binance para realizar el pago directamente
              </p>
            </div>
          )}

          <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 sm:p-6 mb-8">
            <div className="text-center">
              <h4 className="text-base sm:text-lg font-bold text-blue-300 mb-3 px-2">Instrucciones:</h4>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed px-2">
                {currentData.instructions}
              </p>
            </div>
          </div>

          <Button 
            variant="gradient" 
            className="w-full text-lg sm:text-xl py-4 sm:py-6 font-semibold shadow-xl hover:scale-105 transition-all duration-200"
            onClick={onContinue}
          >
            Ya Realicé el Pago - Continuar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;