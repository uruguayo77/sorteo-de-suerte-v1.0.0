import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateApplication, useUploadPaymentProof, useCompleteTemporaryApplication } from "@/hooks/use-supabase";
import type { CreateApplicationData } from "@/lib/supabase";

interface PaymentFormProps {
  selectedNumbers: number[];
  paymentMethod: string;
  onSubmit: (data: { nombre: string; apellido: string; telefono: string; cedula: string; comprobante: File | null }) => void;
  reservationId?: string | null; // ID резервации для обновления
}

interface FormData {
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  comprobante: File | null;
}

const PaymentForm = ({ selectedNumbers, paymentMethod, onSubmit, reservationId }: PaymentFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    cedula: '',
    nombre: '',
    apellido: '',
    telefono: '',
    comprobante: null
  });
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const createApplication = useCreateApplication();
  const uploadPaymentProof = useUploadPaymentProof();
  const completeTemporaryApplication = useCompleteTemporaryApplication();


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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      // 1. Загружаем компробанте
      const paymentProofUrl = await uploadPaymentProof.mutateAsync(formData.comprobante);

      const userData = {
        user_name: `${formData.nombre} ${formData.apellido}`,
        user_phone: formData.telefono,
        cedula: formData.cedula,
        payment_method: paymentMethod!,
        payment_proof_url: paymentProofUrl
      };

      if (reservationId) {
        // 2a. Завершаем временную заявку (обновляем данные пользователя)
        await completeTemporaryApplication.mutateAsync({
          applicationId: reservationId,
          userData
        });

        toast({
          title: "¡Reserva confirmada!",
          description: "Tu solicitud de números reservados está en revisión. Te contactaremos pronto.",
        });
      } else {
        // 2b. Создаем новую заявку (старый способ)
        const applicationData: CreateApplicationData = {
          numbers: selectedNumbers,
          ...userData
        };

        await createApplication.mutateAsync(applicationData);

        toast({
          title: "¡Solicitud enviada!",
          description: "Tu solicitud está en revisión. Te contactaremos pronto.",
        });
      }
      
      onSubmit(formData);
    } catch (error) {
      console.error('Error processing application:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud. Intenta de nuevo.",
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
              Confirmar Datos de Pago
            </h2>
            <p className="text-base sm:text-lg text-gray-300 px-2">
              Números seleccionados:{" "}
              <span className="font-bold text-purple-400">
                {selectedNumbers.map((num, index) => (
                  <span key={num}>
                    #{num}{index < selectedNumbers.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 text-center px-2">
              Información Personal
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cedula" className="text-gray-300 font-medium">Cédula *</Label>
                  <Input
                    id="cedula"
                    placeholder="V-12345678"
                    value={formData.cedula}
                    onChange={(e) => handleInputChange('cedula', e.target.value)}
                    required
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-gray-300 font-medium">Teléfono *</Label>
                  <Input
                    id="telefono"
                    placeholder="0424-1234567"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    required
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-gray-300 font-medium">Nombre *</Label>
                  <Input
                    id="nombre"
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    required
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido" className="text-gray-300 font-medium">Apellido *</Label>
                  <Input
                    id="apellido"
                    placeholder="Tu apellido"
                    value={formData.apellido}
                    onChange={(e) => handleInputChange('apellido', e.target.value)}
                    required
                    className="bg-white/5 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 font-medium">Comprobante de Pago *</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 sm:p-6 transition-all duration-200 ${
                    dragOver 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : formData.comprobante 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-600 hover:border-purple-500/50 bg-white/5'
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
                        <FileImage className="h-8 w-8 text-green-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{formData.comprobante.name}</p>
                          <p className="text-xs text-gray-400">
                            {(formData.comprobante.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="text-gray-400 hover:text-white hover:bg-red-500/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">
                          Arrastra tu comprobante aquí o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-gray-400">
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
                        <Button type="button" variant="outline" asChild className="bg-white/10 border-gray-600 text-white hover:bg-white/20 hover:border-purple-500">
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
                className="w-full text-lg sm:text-xl py-4 sm:py-6 font-semibold shadow-xl hover:scale-105 transition-all duration-200"
              >
                Enviar Datos al Operador
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;