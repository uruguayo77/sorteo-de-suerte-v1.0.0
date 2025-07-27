import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface SuccessMessageProps {
  selectedNumbers: number[];
  onRestart: () => void;
}

const SuccessMessage = ({ selectedNumbers, onRestart }: SuccessMessageProps) => {
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
          <motion.div 
            className="space-y-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Success Icon */}
            <motion.div 
              className="flex justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
            </motion.div>

            {/* Title and Number */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent mb-6">
                ¡Datos Enviados Exitosamente!
              </h1>
              
              {/* Selected Numbers Display */}
              <div className="space-y-3">
                <p className="text-lg sm:text-xl text-gray-300">
                  Tus números seleccionados:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {selectedNumbers.map((num) => (
                    <span key={num} className="inline-block bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-300 font-bold text-lg sm:text-xl px-3 py-2 rounded-xl border border-purple-400/40 shadow-lg">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Main Content Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="bg-white/10 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-lg sm:text-xl font-semibold text-white">
                      Tus datos de pago han sido enviados al operador.
                    </p>
                    <p className="text-gray-300 text-base sm:text-lg">
                      Recibirás la confirmación pronto.
                    </p>
                  </div>
                  
                  {/* Steps Card */}
                  <div className="bg-white/5 backdrop-blur-sm border border-gray-600 rounded-xl p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-blue-300 mb-4 text-center">
                      Próximos pasos:
                    </h3>
                    <div className="space-y-3 text-left">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-300 text-sm sm:text-base">El operador verificará tu pago</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-300 text-sm sm:text-base">Recibirás confirmación por WhatsApp</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-300 text-sm sm:text-base">Si resultas ganador, serás notificado automáticamente</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button 
                variant="outline" 
                onClick={onRestart}
                className="inline-flex items-center gap-2 bg-white/10 border-gray-600 text-gray-300 hover:bg-white/20 hover:text-white hover:border-purple-400 transition-all duration-300 px-6 py-3 text-base font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Participar Nuevamente
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SuccessMessage;