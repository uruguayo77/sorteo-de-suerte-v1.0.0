import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentFormProps {
  selectedNumbers: number[];
  paymentMethod: string;
  onSubmit: (data: { nombre: string; apellido: string; telefono: string; cedula: string; comprobante: File | null }) => void;
}

interface FormData {
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  comprobante: File | null;
}

const PaymentForm = ({ selectedNumbers, paymentMethod, onSubmit }: PaymentFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    cedula: '',
    nombre: '',
    apellido: '',
    telefono: '',
    comprobante: null
  });
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, comprobante: file }));
      toast({
        title: "¡Archivo cargado!",
        description: `Comprobante "${file.name}" cargado correctamente`,
      });
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeFile = () => {
    setFormData(prev => ({ ...prev, comprobante: null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.cedula || !formData.nombre || !formData.apellido || !formData.telefono) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (!formData.comprobante) {
      toast({
        title: "Error",
        description: "Por favor sube el comprobante de pago",
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Confirmar Datos de Pago
        </h2>
        <p className="text-muted-foreground">
          Números seleccionados:{" "}
          <span className="font-bold text-primary">
            {selectedNumbers.map((num, index) => (
              <span key={num}>
                #{num}{index < selectedNumbers.length - 1 ? ", " : ""}
              </span>
            ))}
          </span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cedula">Cédula *</Label>
                <Input
                  id="cedula"
                  placeholder="V-12345678"
                  value={formData.cedula}
                  onChange={(e) => handleInputChange('cedula', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  placeholder="0424-1234567"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Tu nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  placeholder="Tu apellido"
                  value={formData.apellido}
                  onChange={(e) => handleInputChange('apellido', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comprobante de Pago *</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragOver 
                    ? 'border-primary bg-primary/5' 
                    : formData.comprobante 
                      ? 'border-success bg-success/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
              >
                {formData.comprobante ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileImage className="h-8 w-8 text-success" />
                      <div>
                        <p className="text-sm font-medium">{formData.comprobante.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(formData.comprobante.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Arrastra tu comprobante aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Formatos soportados: JPG, PNG, PDF (máx. 10MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="inline-block mt-4 cursor-pointer"
                    >
                      <Button type="button" variant="outline" asChild>
                        <span>Seleccionar Archivo</span>
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              variant="gradient" 
              className="w-full text-lg py-6"
            >
              Enviar Datos al Operador
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentForm;