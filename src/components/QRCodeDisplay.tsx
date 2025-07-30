import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { qrService } from '@/lib/qrService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeDisplayProps {
  applicationId: string;
  className?: string;
}

const QRCodeDisplay = ({ applicationId, className = '' }: QRCodeDisplayProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateQRCode();
  }, [applicationId]);

  const generateQRCode = async () => {
    if (!applicationId) {
      setError('ID de solicitud no válido');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const qrUrl = await qrService.generateQRCode(applicationId);
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError(err instanceof Error ? err.message : 'Error al generar código QR');
      
      toast.error('Error al generar código QR', {
        description: 'No se pudo crear el código QR. Intenta recargar la página.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    try {
      const link = document.createElement('a');
      link.download = `qr-participacion-${applicationId.slice(0, 8)}.png`;
      link.href = qrCodeUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Código QR descargado', {
        description: 'El archivo se ha guardado en tu dispositivo'
      });
    } catch (err) {
      console.error('Error downloading QR code:', err);
      toast.error('Error al descargar', {
        description: 'No se pudo descargar el código QR'
      });
    }
  };

  const shareQRCode = async () => {
    if (!qrCodeUrl) return;

    try {
      // Intentar usar la Web Share API si está disponible
      if (navigator.share && navigator.canShare) {
        // Convertir data URL a blob para compartir
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], 'qr-participacion.png', { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Mi Código de Participación',
            text: 'Código QR de confirmación de participación en el sorteo',
            files: [file]
          });
          
          toast.success('Código QR compartido exitosamente');
          return;
        }
      }

      // Fallback: copiar al portapapeles
      await navigator.clipboard.writeText(window.location.origin + '/verificar?token=...');
      toast.success('Enlace copiado al portapapeles', {
        description: 'Puedes compartir este enlace con otros'
      });
    } catch (err) {
      console.error('Error sharing QR code:', err);
      
      // Último fallback: solo mostrar mensaje
      toast.info('Comparte tu código QR', {
        description: 'Puedes tomar una captura de pantalla para compartir'
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-6 bg-white/10 backdrop-blur-sm border-gray-700 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-64 h-64 bg-gray-800/50 rounded-lg flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
          <p className="text-gray-300 text-center">Generando código QR...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 bg-white/10 backdrop-blur-sm border-gray-700 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-64 h-64 bg-red-900/20 rounded-lg flex items-center justify-center border border-red-500/30">
            <QrCode className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-red-400 font-medium mb-2">Error al generar QR</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <Button 
              onClick={generateQRCode}
              variant="outline"
              size="sm"
              className="bg-white/10 border-gray-600 text-white hover:bg-white/20"
            >
              Reintentar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
        <div className="flex flex-col items-center space-y-6">
          {/* Título */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-semibold text-white">Código de Confirmación</h3>
            </div>
            <p className="text-gray-300 text-sm">
              Escanea este código para verificar tu participación
            </p>
          </div>

          {/* QR Code */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative"
          >
            <div className="p-4 bg-white rounded-xl shadow-2xl">
              <img 
                src={qrCodeUrl!} 
                alt="Código QR de confirmación"
                className="w-64 h-64 block"
              />
            </div>
            
            {/* Decorative corners */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-purple-400 rounded-tl-lg" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-purple-400 rounded-tr-lg" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-purple-400 rounded-bl-lg" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-purple-400 rounded-br-lg" />
          </motion.div>

          {/* Instrucciones */}
          <div className="text-center space-y-2">
            <p className="text-gray-300 text-sm">
              <strong className="text-white">Instrucciones:</strong>
            </p>
            <ul className="text-gray-400 text-xs space-y-1 max-w-xs">
              <li>• Guarda este código QR en tu dispositivo</li>
              <li>• Escanéalo para verificar el estado de tu participación</li>
              <li>• Úsalo para confirmar si resultaste ganador</li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 w-full max-w-xs">
            <Button
              onClick={downloadQRCode}
              variant="outline"
              size="sm"
              className="flex-1 bg-white/10 border-gray-600 text-white hover:bg-white/20 hover:border-purple-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
            
            <Button
              onClick={shareQRCode}
              variant="outline"
              size="sm"
              className="flex-1 bg-white/10 border-gray-600 text-white hover:bg-white/20 hover:border-purple-500"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartir
            </Button>
          </div>

          {/* Nota de seguridad */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 max-w-xs">
            <p className="text-blue-300 text-xs text-center">
              <strong>Importante:</strong> Este código QR es único y personal. 
              No lo compartas con personas desconocidas.
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default QRCodeDisplay; 