import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NumberGrid from "@/components/NumberGrid";
import PaymentMethod from "@/components/PaymentMethod";
import PaymentDetails from "@/components/PaymentDetails";
import PaymentForm from "@/components/PaymentForm";
import SuccessMessage from "@/components/SuccessMessage";
import WinnerNotification from "@/components/WinnerNotification";
import DrawStatus from "@/components/DrawStatus";
import { useToast } from "@/hooks/use-toast";
import { useWinners } from "@/hooks/use-supabase";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { testSupabaseConnection } from "@/lib/test-connection";
import { useEffect } from "react";
import { FlipWords } from "@/components/ui/flip-words";
import CountdownReel from "@/components/ui/countdown-reel";
import { Link } from "react-router-dom";

type Step = 'number-selection' | 'payment-method' | 'payment-details' | 'payment-form' | 'success';
type PaymentMethodType = 'pago-movil' | 'binance' | 'bybit' | null;

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>('number-selection');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(null);
  const [showWinnerNotification, setShowWinnerNotification] = useState(false);
  const { toast } = useToast();
  const { data: winners } = useWinners();
  const { isAuthenticated } = useAdminAuth();

  // Тестируем подключение к Supabase при загрузке
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const handleNumberSelect = (number: number) => {
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        // Если номер уже выбран, убираем его
        return prev.filter(n => n !== number);
      } else if (prev.length < 3) {
        // Если выбрано меньше 3 номеров, добавляем новый
        return [...prev, number];
      }
      // Если уже выбрано 3 номера, не добавляем новый
      return prev;
    });
  };

  const handleContinueToPayment = () => {
    if (selectedNumbers.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos un número",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('payment-method');
  };

  const handlePaymentMethodSelect = (method: PaymentMethodType) => {
    setPaymentMethod(method);
    setCurrentStep('payment-details');
  };

  const handleContinueToForm = () => {
    setCurrentStep('payment-form');
  };

  const handleFormSubmit = (formData: { nombre: string; apellido: string; telefono: string; cedula: string; comprobante: File | null }) => {
    setCurrentStep('success');
    
    // Проверяем, есть ли победители среди выбранных номеров
    if (winners && winners.length > 0) {
      const winningNumbers = selectedNumbers.filter(number => 
        winners.some(winner => winner.number === number)
      );
      if (winningNumbers.length > 0) {
        setTimeout(() => {
          setShowWinnerNotification(true);
        }, 3000);
      }
    }
  };

  const handleRestart = () => {
    setCurrentStep('number-selection');
    setSelectedNumbers([]);
    setPaymentMethod(null);
  };

  const handleBackToNumberSelection = () => {
    setCurrentStep('number-selection');
  };

  const handleBackToPaymentMethod = () => {
    setCurrentStep('payment-method');
  };

  const handleBackToPaymentDetails = () => {
    setCurrentStep('payment-details');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'number-selection':
        return (
          <div className="min-h-[120vh] sm:min-h-[110vh] lg:min-h-screen relative overflow-hidden">
            {/* Верхняя секция с текстом */}
            <div className="relative z-20 pt-6 pb-6 px-4 sm:pt-8 sm:pb-8 lg:pt-12 lg:pb-12">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4">
                  Sorteo de Premios
                </h1>
                <div className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 lg:mb-10">
                  Elige tu{" "}
                  <FlipWords 
                    words={["número", "suerte", "destino"]} 
                    duration={2000}
                    className="text-purple-400 font-bold"
                  />
                  {" "}del 1 al 100
                </div>
                

                
                {/* Countdown Reel в верхней секции */}
                <div className="mt-8 sm:mt-10 lg:mt-12 flex justify-center">
                  <CountdownReel />
                </div>
              </div>
            </div>

            {/* Полукруглый белый разделитель */}
            <div className="absolute top-[45vh] sm:top-[48vh] lg:top-[45vh] left-0 right-0 bottom-0 bg-white rounded-t-[60px] sm:rounded-t-[70px] lg:rounded-t-[80px] shadow-2xl">
              <div className="relative h-full pt-6 sm:pt-8 px-4 pb-20 sm:pb-24 overflow-y-auto">
                <NumberGrid
                  selectedNumbers={selectedNumbers}
                  onNumberSelect={handleNumberSelect}
                />
              </div>
            </div>

            {/* Секция с выбранными числами и кнопкой */}
            {selectedNumbers.length > 0 && (
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-30 px-4 w-full max-w-md">
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-gray-700">
                  <p className="text-sm sm:text-base text-center text-gray-300 mb-2">
                    Números seleccionados:{" "}
                    <span className="font-bold text-purple-400 text-lg sm:text-xl">
                      {selectedNumbers.map((num, index) => (
                        <span key={num}>
                          #{num}{index < selectedNumbers.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </span>
                  </p>
                  <p className="text-xs text-center text-gray-400">
                    Puedes seleccionar hasta 3 números ({selectedNumbers.length}/3)
                  </p>
                </div>
                <Button 
                  variant="gradient" 
                  size="lg" 
                  className="text-base sm:text-lg lg:text-xl px-8 sm:px-12 py-3 sm:py-4 font-semibold shadow-2xl w-full"
                  onClick={handleContinueToPayment}
                >
                  Continuar
                </Button>
              </div>
            )}
          </div>
        );

      case 'payment-method':
        return (
          <div className="space-y-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToNumberSelection}
              className="mb-6 text-gray-300 hover:text-purple-400 hover:bg-gray-800/50"
            >
              ← Volver a Selección
            </Button>
            <PaymentMethod onMethodSelect={handlePaymentMethodSelect} />
          </div>
        );

      case 'payment-details':
        return (
          <div className="space-y-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToPaymentMethod}
              className="mb-6 text-gray-300 hover:text-purple-400 hover:bg-gray-800/50"
            >
              ← Volver a Métodos
            </Button>
            <PaymentDetails 
              method={paymentMethod!} 
              onContinue={handleContinueToForm} 
            />
          </div>
        );

      case 'payment-form':
        return (
          <div className="space-y-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToPaymentDetails}
              className="mb-6 text-gray-300 hover:text-purple-400 hover:bg-gray-800/50"
            >
              ← Volver a Datos de Pago
            </Button>
            <PaymentForm
              selectedNumbers={selectedNumbers}
              paymentMethod={paymentMethod!}
              onSubmit={handleFormSubmit}
            />
          </div>
        );

      case 'success':
        return (
          <SuccessMessage
            selectedNumber={selectedNumber!}
            onRestart={handleRestart}
          />
        );

      default:
        return null;
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
        <div className="max-w-4xl mx-auto">
          {renderStep()}
        </div>
      </div>

      {showWinnerNotification && (
        <WinnerNotification
          winningNumber={selectedNumber!}
          prize="$500 USD"
          onClose={() => setShowWinnerNotification(false)}
        />
      )}

      {/* Admin Panel Access - positioned in header */}
      <div className="fixed top-4 right-4 z-50">
        {isAuthenticated ? (
          <Link to="/admin">
            <Button
              className="bg-gray-800/90 hover:bg-gray-700 text-white border border-gray-600 rounded-full p-3 shadow-lg backdrop-blur-sm"
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <g clipPath="url(#clip0_3111_32640)">
                  <path d="M15.02 3.01001C14.18 2.37001 13.14 2 12 2C9.24 2 7 4.24 7 7C7 9.76 9.24 12 12 12C14.76 12 17 9.76 17 7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <defs>
                  <clipPath id="clip0_3111_32640">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </Button>
          </Link>
        ) : (
          <Link to="/admin/login">
            <Button
              className="bg-gray-800/90 hover:bg-gray-700 text-white border border-gray-600 rounded-full p-3 shadow-lg backdrop-blur-sm"
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <g clipPath="url(#clip0_3111_32640)">
                  <path d="M15.02 3.01001C14.18 2.37001 13.14 2 12 2C9.24 2 7 4.24 7 7C7 9.76 9.24 12 12 12C14.76 12 17 9.76 17 7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <defs>
                  <clipPath id="clip0_3111_32640">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </Button>
          </Link>
        )}
      </div>

      {/* Draw Status - shows countdown, waiting for results, or winner */}
      <DrawStatus />
    </div>
  );
};

export default Index;
