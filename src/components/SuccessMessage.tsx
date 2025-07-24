import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";

interface SuccessMessageProps {
  selectedNumber: number;
  onRestart: () => void;
}

const SuccessMessage = ({ selectedNumber, onRestart }: SuccessMessageProps) => {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="w-24 h-24 bg-success rounded-full flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-white" />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-foreground mb-4">
          ¡Datos Enviados Exitosamente!
        </h2>
        <p className="text-lg text-muted-foreground mb-2">
          Tu número seleccionado: <span className="font-bold text-primary">#{selectedNumber}</span>
        </p>
      </div>

      <Card className="bg-gradient-to-br from-success/10 to-primary/10 border-success/20">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-lg font-medium text-foreground">
              Tus datos de pago han sido enviados al operador.
            </p>
            <p className="text-muted-foreground">
              Recibirás la confirmación pronto.
            </p>
            <div className="bg-card p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <strong>Próximos pasos:</strong><br />
                • El operador verificará tu pago<br />
                • Recibirás confirmación por WhatsApp<br />
                • Si resultas ganador, serás notificado automáticamente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        variant="outline" 
        onClick={onRestart}
        className="inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Participar Nuevamente
      </Button>
    </div>
  );
};

export default SuccessMessage;