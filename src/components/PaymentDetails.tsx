import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PaymentDetailsProps {
  method: 'pago-movil' | 'binance' | 'bybit';
  onContinue: () => void;
}

const PaymentDetails = ({ method, onContinue }: PaymentDetailsProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const paymentData = {
    'pago-movil': {
      title: 'Pago Móvil',
      fields: [
        { label: 'Banco', value: 'Banco de Venezuela' },
        { label: 'Teléfono', value: '0424-1234567' },
        { label: 'Cédula', value: 'V-12345678' },
        { label: 'Monto', value: '$10.00 USD' }
      ],
      instructions: 'Realiza la transferencia desde tu app bancaria y sube el comprobante en el siguiente paso.'
    },
    'binance': {
      title: 'Binance USDT',
      fields: [
        { label: 'Red', value: 'TRC20 (Tron)' },
        { label: 'Dirección', value: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' },
        { label: 'Monto', value: '10 USDT' }
      ],
      instructions: 'Envía exactamente 10 USDT a la dirección mostrada y sube el comprobante de la transacción.'
    },
    'bybit': {
      title: 'ByBit USDT',
      fields: [
        { label: 'Red', value: 'TRC20 (Tron)' },
        { label: 'Dirección', value: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' },
        { label: 'Monto', value: '10 USDT' }
      ],
      instructions: 'Envía exactamente 10 USDT a la dirección mostrada y sube el comprobante de la transacción.'
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
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent mb-4 px-2">
              Datos para {currentData.title}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 px-2">
              Copia los datos y realiza el pago
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 text-center px-2">
              Información de Pago
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