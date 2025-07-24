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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Datos para {currentData.title}
        </h2>
        <p className="text-muted-foreground">
          Copia los datos y realiza el pago
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-center text-lg">
            Información de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentData.fields.map((field, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-card rounded-lg border">
              <div>
                <span className="text-sm text-muted-foreground">{field.label}:</span>
                <p className="font-medium text-foreground">{field.value}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(field.value, field.label)}
                className="shrink-0"
              >
                {copiedField === field.label ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-warning/10 border-warning/20">
        <CardContent className="pt-6">
          <CardDescription className="text-center text-sm">
            <strong>Instrucciones:</strong><br />
            {currentData.instructions}
          </CardDescription>
        </CardContent>
      </Card>

      <Button 
        variant="gradient" 
        className="w-full text-lg py-6"
        onClick={onContinue}
      >
        Ya Realicé el Pago - Continuar
      </Button>
    </div>
  );
};

export default PaymentDetails;