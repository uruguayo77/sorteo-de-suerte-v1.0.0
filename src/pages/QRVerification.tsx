import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  Hash,
  Calendar,
  Trophy,
  AlertTriangle,
  Home,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  useQRVerification, 
  useQRTokenFromUrl, 
  useApplicationStatus,
  useDrawResults,
  useUserDataFormatter,
  useQRValidation,
  useRealtimeStatusUpdates
} from '@/hooks/use-qr-verification';
import InstantTicketsSection from '@/components/InstantTicketsSection';
import { toast } from 'sonner';

const QRVerification = () => {
  const navigate = useNavigate();
  const { token, isValidToken } = useQRTokenFromUrl();
  const { data: verificationData, isLoading, error, refetch } = useQRVerification(token || undefined);
  const statusInfo = useApplicationStatus(verificationData);
  const drawInfo = useDrawResults(verificationData);
  const userData = useUserDataFormatter(verificationData);
  const { validateQRData } = useQRValidation();
  
  // Real-time updates
  useRealtimeStatusUpdates(verificationData?.id);

  // Validar datos QR
  const validation = validateQRData(verificationData, token);

  useEffect(() => {
    // Mostrar advertencias si las hay
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        toast.warning('Advertencia', {
          description: warning,
          duration: 5000
        });
      });
    }
  }, [validation.warnings]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado al portapapeles`);
    } catch (err) {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  const refreshData = () => {
    refetch();
    toast.info('Actualizando información...');
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="p-8 bg-white/10 backdrop-blur-sm border-gray-700 max-w-md w-full mx-4">
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <QrCode className="w-12 h-12 text-purple-400" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white">Verificando código QR...</h2>
            <p className="text-gray-300 text-center">
              Por favor espera mientras verificamos tu código de participación
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Error State
  if (!isValidToken || error || !validation.isValid) {
    const errorMessage = !token 
      ? 'No se proporcionó un código QR para verificar'
      : !isValidToken 
      ? 'El formato del código QR no es válido'
      : error?.message || validation.errors[0] || 'Error desconocido';

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="p-8 bg-white/10 backdrop-blur-sm border-gray-700 max-w-md w-full mx-4">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center border-2 border-red-500/30">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-white">Código QR inválido</h2>
              <p className="text-gray-300">{errorMessage}</p>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="flex-1 bg-white/10 border-gray-600 text-white hover:bg-white/20"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir al inicio
              </Button>
              
              {token && (
                <Button
                  onClick={refreshData}
                  variant="outline"
                  className="flex-1 bg-white/10 border-gray-600 text-white hover:bg-white/20"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Success State
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <QrCode className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Verificación de Participación</h1>
          </div>
          <p className="text-gray-300">
            Información completa de tu participación en el sorteo
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Estado de la Solicitud</h2>
              <Button
                onClick={refreshData}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
              <div className="text-3xl">
                {statusInfo.statusIcon}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-medium ${statusInfo.statusColor}`}>
                  {statusInfo.statusText}
                </h3>
                <p className="text-gray-300 text-sm mt-1">
                  {statusInfo.description}
                </p>
              </div>
              {statusInfo.status === 'approved' && (
                <CheckCircle className="w-6 h-6 text-green-400" />
              )}
              {statusInfo.status === 'rejected' && (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              {statusInfo.status === 'pending' && (
                <Clock className="w-6 h-6 text-yellow-400" />
              )}
            </div>
          </Card>
        </motion.div>

        {/* User Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Información del Participante</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <User className="w-5 h-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Nombre</p>
                    <p className="text-white font-medium">{userData.name}</p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(userData.name, 'Nombre')}
                    variant="ghost"
                    size="sm"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Teléfono</p>
                    <p className="text-white font-medium">{userData.phone}</p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(userData.phone, 'Teléfono')}
                    variant="ghost"
                    size="sm"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <Hash className="w-5 h-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Cédula</p>
                    <p className="text-white font-medium">{userData.cedula}</p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(userData.cedula, 'Cédula')}
                    variant="ghost"
                    size="sm"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Método de Pago</p>
                    <p className="text-white font-medium">{userData.paymentMethod}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <Hash className="w-5 h-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Números Seleccionados</p>
                    <p className="text-white font-medium text-lg">{userData.numbers}</p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(userData.numbers, 'Números')}
                    variant="ghost"
                    size="sm"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Fecha de Participación</p>
                    <p className="text-white font-medium">{userData.createdAt}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Draw Information */}
        {drawInfo.drawName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Información del Sorteo</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <Trophy className="w-5 h-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Nombre del Sorteo</p>
                    <p className="text-white font-medium">{drawInfo.drawName}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  drawInfo.isWinner 
                    ? 'bg-green-900/20 border-green-500/30' 
                    : drawInfo.hasResult 
                    ? 'bg-gray-800/50 border-gray-600/30'
                    : 'bg-blue-900/20 border-blue-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {drawInfo.isWinner ? '🏆' : drawInfo.hasResult ? '😔' : '⏳'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-lg font-medium ${drawInfo.resultColor}`}>
                        {drawInfo.resultText}
                      </p>
                      {!drawInfo.hasResult && (
                        <p className="text-gray-400 text-sm mt-1">
                          Te notificaremos cuando el sorteo termine
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Instant Tickets Section */}
        <InstantTicketsSection 
          applicationId={verificationData?.id}
          applicationStatus={statusInfo.status}
        />

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4 justify-center"
        >
          <Button
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
          >
            <Home className="w-4 h-4 mr-2" />
            Volver al Inicio
          </Button>
          
          <Button
            onClick={() => window.open('https://t.me/delivery_ccs', '_blank')}
            variant="outline"
            className="bg-white/10 border-gray-600 text-white hover:bg-white/20 px-8 py-3"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Contactar Soporte
          </Button>
        </motion.div>

        {/* Warnings */}
        <AnimatePresence>
          {validation.warnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="bg-yellow-900/20 border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">
                  <ul className="list-disc pl-4 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QRVerification; 