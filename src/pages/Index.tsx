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
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import DrawFinishedModal from "@/components/DrawFinishedModal";
import { useToast } from "@/hooks/use-toast";
import { useWinners, useReserveNumbersTemporarily } from "@/hooks/use-supabase";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useOnboardingVisibility } from "@/hooks/use-onboarding";
import { useDrawFinishedModal } from "@/hooks/use-draw-finished-modal";
import { useNavigationControl } from "@/hooks/use-navigation-control";
import { useLotteryStore } from "@/lib/lotteryStore";
import { testSupabaseConnection } from "@/lib/test-connection";
import { useEffect } from "react";
import { FlipWords } from "@/components/ui/flip-words";
import CountdownReel from "@/components/ui/countdown-reel";
import { Link } from "react-router-dom";
import { ReservationTimer } from "@/components/ReservationTimer";
import { useActiveLotteryDraw, useLastFinishedDraw } from "@/hooks/use-supabase";
import NavigationConfirmDialog from "@/components/NavigationConfirmDialog";
import confetti from 'canvas-confetti';
// import SocialLinks from "@/components/SocialLinks"; // Временно скрыто

type Step = 'number-selection' | 'payment-method' | 'payment-details' | 'payment-form' | 'success';
type PaymentMethodType = 'pago-movil' | 'binance' | null; // | 'bybit' - временно скрыто

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>('number-selection');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(null);
  const [showWinnerNotification, setShowWinnerNotification] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const { toast } = useToast();
  const { data: winners } = useWinners();
  const { isAuthenticated } = useAdminAuth();
  const reserveNumbers = useReserveNumbersTemporarily();
  
  // Онбординг
  const { isOnboardingOpen, closeOnboarding, config } = useOnboardingVisibility();
  
  // Модальное окно завершенного розыгрыша
  const { 
    isVisible: isDrawFinishedVisible, 
    hasWinner: drawHasWinner
  } = useDrawFinishedModal();
  
  // Добавляем состояние лотереи
  const { 
    showWinnerModal, 
    winnerNumber, 
    lotteryName, 
    lotteryNumber, 
    prizeAmount, 
    closeWinnerModal 
  } = useLotteryStore();

  // Получаем активный розыгрыш и последний завершенный
  const { data: currentDraw } = useActiveLotteryDraw();
  const { data: lastFinishedDraw } = useLastFinishedDraw();

  // Запускаем конфетти всегда когда показывается модальное окно с победителем
  useEffect(() => {
    const showWinnerModal = ((currentDraw?.status === 'finished' && currentDraw?.winner_number) || 
                            (!currentDraw && lastFinishedDraw?.winner_number)) &&
                           (!currentDraw || currentDraw.status !== 'active');
    
    if (showWinnerModal) {
      // Немедленное зеленое конфетти
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#16a34a', '#15803d', '#10b981', '#34d399']
      });

      // Дополнительные взрывы с интервалами
      setTimeout(() => {
        confetti({
          particleCount: 150,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22c55e', '#16a34a', '#15803d', '#10b981', '#34d399']
        });
        confetti({
          particleCount: 150,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#22c55e', '#16a34a', '#15803d', '#10b981', '#34d399']
        });
      }, 800);

      // Третья волна конфетти
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#22c55e', '#16a34a', '#15803d', '#10b981', '#34d399', '#6ee7b7']
        });
      }, 1600);
    }
  }, [currentDraw?.status, currentDraw?.winner_number, lastFinishedDraw?.winner_number]);

  // Navigation control для управления браузерной навигацией
  const {
    navigationState,
    updateNavigationState,
    showConfirmDialog,
    confirmNavigation,
    cancelNavigation,
    cleanup: cleanupNavigation
  } = useNavigationControl();

  // Тестируем подключение к Supabase при загрузке
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  // Синхронизация navigation state с существующим состоянием
  useEffect(() => {
    updateNavigationState({
      currentStep,
      hasActiveReservation: !!reservationId,
      reservationId,
      selectedNumbers
    });
  }, [currentStep, reservationId, selectedNumbers, updateNavigationState]);

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

  const handleContinueToPayment = async () => {
    if (selectedNumbers.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos un número",
        variant: "destructive",
      });
      return;
    }

    // Проверяем наличие активного розыгрыша
    if (!currentDraw || currentDraw.status !== 'active') {
      toast({
        title: "Error",
        description: "No hay un sorteo activo disponible en este momento",
        variant: "destructive",
      });
      return;
    }

    console.log('Attempting to reserve numbers:', {
      selectedNumbers,
      currentDraw: currentDraw?.id,
      drawName: currentDraw?.draw_name
    });

    // Временно блокируем числа на 15 минут
    setIsReserving(true);
    
    try {
      const result = await reserveNumbers.mutateAsync({
        numbers: selectedNumbers,
        userName: 'Usuario Temporal', // Будет обновлено при заполнении формы
        userPhone: 'Temporal',
        cedula: 'Temporal',
        paymentMethod: 'temporal'
      });

      console.log('Reservation successful:', result);

      setReservationId(result.application_id);
      
      toast({
        title: "¡Números Reservados!",
        description: `Tienes 15 minutos para completar el pago de los números: ${selectedNumbers.join(', ')}`,
        duration: 5000,
      });

      setCurrentStep('payment-method');
    } catch (error: any) {
      console.error('Failed to reserve numbers:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Показываем более понятное сообщение об ошибке
      const errorMessage = error.message?.includes('ocupados') 
        ? error.message 
        : error.message || 'No se pudieron reservar los números. Intenta de nuevo.';
        
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsReserving(false);
    }
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
    
    // НЕ очищаем reservationId - резервация должна оставаться активной до решения оператора
    // НЕ очищаем selectedNumbers - номера должны оставаться заблокированными
    
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
    // Пользователь может участвовать снова, выбирая новые номера
    // Предыдущие номера остаются заблокированными до решения администратора
    setCurrentStep('number-selection');
    setSelectedNumbers([]);
    setPaymentMethod(null);
    setReservationId(null);
    setShowWinnerNotification(false);
    
    toast({
      title: "Nueva Participación",
      description: "Puedes seleccionar nuevos números para participar.",
      variant: "default",
    });
  };

  const handleBackToNumberSelection = () => {
    // Блокируем навигацию назад если есть активная резервация
    if (reservationId) {
      toast({
        title: "Navegación bloqueada",
        description: "Debes cancelar o completar tu reservación actual antes de volver atrás",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('number-selection');
  };

  const handleBackToPaymentMethod = () => {
    // Просто возвращаемся к выбору методов, сохраняя активную резервацию
    // Пользователь сам может отменить резервацию через таймер, если захочет
    setCurrentStep('payment-method');
  };

  const handleBackToPaymentDetails = () => {
    // Разрешаем навигацию назад к деталям оплаты, сохраняя резервацию
    // Пользователь может отменить резервацию через таймер, если понадобится
    setCurrentStep('payment-details');
  };

  // Функция для обработки отмены резервации
  const handleReservationCanceled = () => {
    // Очищаем состояние резервации
    setReservationId(null);
    
    // Автоматически возвращаемся на главный экран
    setCurrentStep('number-selection');
    
    // Очищаем выбранные номера (по желанию)
    setSelectedNumbers([]);
    
    // Сбрасываем метод оплаты
    setPaymentMethod(null);
  };

  // Функция для получения заголовка
  const getHeaderTitle = () => {
    if (currentDraw && currentDraw.status === 'active') {
      return currentDraw.draw_name;
    }
    return "Sorteo de Premios";
  };

  // Функция для получения фотографий призов
  const getPrizeImages = () => {
    if (currentDraw && currentDraw.status === 'active') {
      const images = [];
      if (currentDraw.prize_image_1 && currentDraw.prize_image_1.trim() !== '') images.push(currentDraw.prize_image_1);
      if (currentDraw.prize_image_2 && currentDraw.prize_image_2.trim() !== '') images.push(currentDraw.prize_image_2);
      if (currentDraw.prize_image_3 && currentDraw.prize_image_3.trim() !== '') images.push(currentDraw.prize_image_3);
      return images;
    }
    return [];
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'number-selection':
        return (
          <div className="min-h-screen flex flex-col">
            {/* Верхняя секция с текстом */}
            <div className="relative z-20 pt-6 pb-6 px-4 sm:pt-8 sm:pb-8 lg:pt-12 lg:pb-12">
              <div className="text-center max-w-4xl mx-auto w-full">
                {/* "Sorteo de Suerte" con efecto especial */}
                <div className="sorteo-title mb-2 sm:mb-4">
                  <div>Sorteo</div>
                  <div className="flex gap-2 justify-center">
                    <div>De</div>
                    <div>Suerte</div>
                  </div>
                </div>
                
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4">
                  {getHeaderTitle()}
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
              </div>
            </div>
            
            {/* Flex контейнер с фиксированными отступами - НЕТ перекрытий */}
            <div className="flex-1 flex flex-col px-4 gap-6 sm:gap-8 min-h-0 pb-8">
              
              {/* Countdown Timer */}
              <div className="flex justify-center">
                <CountdownReel />
              </div>
              
              {/* Контейнер с выбранными числами - появляется только при выборе */}
              {selectedNumbers.length > 0 && (
                <div className="flex justify-center">
                  <div className="w-full max-w-lg">
                    <div className="bg-gradient-to-br from-purple-100/20 via-blue-100/20 to-purple-100/20 backdrop-blur-md border border-purple-300/30 rounded-3xl p-4 shadow-2xl">
                      <div className="w-full max-w-sm mx-auto">
                        <div className="bg-white/95 backdrop-blur-sm border border-purple-200 rounded-2xl p-4 mb-4 shadow-xl">
                          <div className="space-y-3">
                            <p className="text-sm sm:text-base text-center text-gray-700 font-semibold">
                              Números seleccionados:
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {selectedNumbers.map((num) => (
                                <span key={num} className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-base px-3 py-2 rounded-xl shadow-md">
                                  {num}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-center text-gray-500 mt-3">
                            Puedes seleccionar hasta 3 números ({selectedNumbers.length}/3)
                          </p>
                        </div>
                                                <Button
                          variant="gradient" 
                          size="lg" 
                          className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 font-semibold shadow-xl w-full rounded-xl"
                          onClick={handleContinueToPayment}
                          disabled={isReserving}
                        >
                          {isReserving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Reservando números...
                            </>
                          ) : (
                            'Continuar'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Контейнер с номерами - flex-1 занимает оставшееся место */}
              <div className="flex-1 min-h-[400px] flex flex-col">
                <div className="bg-gradient-to-br from-purple-100/20 via-blue-100/20 to-purple-100/20 backdrop-blur-md border border-purple-300/30 rounded-3xl p-2 sm:p-4 shadow-2xl h-full">
                  <div className="bg-white rounded-t-[40px] sm:rounded-t-[60px] lg:rounded-t-[80px] rounded-b-[30px] sm:rounded-b-[40px] lg:rounded-b-[60px] shadow-xl overflow-hidden h-full">
                                          <div className="relative h-full pt-4 sm:pt-6 lg:pt-8 px-6 sm:px-3 lg:px-4 pb-4 sm:pb-6 lg:pb-8 overflow-y-auto overflow-x-hidden number-container-landscape">
                      <NumberGrid
                        selectedNumbers={selectedNumbers}
                        onNumberSelect={handleNumberSelect}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Panel Access - fixed в правом верхнем углу */}
            <div className="fixed top-4 right-4 z-[9999]">
              {isAuthenticated ? (
                <Link to="/admin">
                  <Button
                    className="bg-gray-800/95 hover:bg-gray-700 text-white border border-gray-600 p-3 shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 rounded-xl"
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
                    className="bg-gray-800/95 hover:bg-gray-700 text-white border border-gray-600 p-3 shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 rounded-xl"
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
          </div>
        );

      case 'payment-method':
        return (
          <div className="relative">
            <div className="space-y-6">
              <ReservationTimer 
                reservationId={reservationId} 
                selectedNumbers={selectedNumbers}
                onCanceled={handleReservationCanceled}
                onNavigationCleanup={cleanupNavigation}
              />
              <PaymentMethod onMethodSelect={handlePaymentMethodSelect} />
            </div>
          </div>
        );

      case 'payment-details':
        return (
          <div className="relative">
            <div className="space-y-6">
              <Button 
                variant="ghost" 
                onClick={handleBackToPaymentMethod}
                className="mb-6 text-gray-300 hover:text-purple-400 hover:bg-gray-800/50"
              >
                ← Volver a Métodos
              </Button>
              <ReservationTimer 
                reservationId={reservationId} 
                selectedNumbers={selectedNumbers}
                onCanceled={handleReservationCanceled}
                onNavigationCleanup={cleanupNavigation}
              />
              <PaymentDetails 
                method={paymentMethod!} 
                selectedNumbers={selectedNumbers}
                onContinue={handleContinueToForm} 
              />
            </div>
          </div>
        );

      case 'payment-form':
        return (
          <div className="relative">
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
                reservationId={reservationId}
              />
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="relative">
            <SuccessMessage
              selectedNumbers={selectedNumbers}
              onRestart={handleRestart}
              applicationId={reservationId || undefined}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-y-auto">
      {/* Abstract background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 w-full">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto w-full">
            {renderStep()}
          </div>
        </div>
      </div>

      {showWinnerNotification && (
        <WinnerNotification
          winningNumber={selectedNumber!}
          prize="$500 USD"
          lotteryName="Reserva de Número"
          onClose={() => setShowWinnerNotification(false)}
        />
      )}

      {/* Модальное окно победителя лотереи */}
      {showWinnerModal && winnerNumber && (
        <WinnerNotification
          winningNumber={winnerNumber}
          prize={prizeAmount}
          lotteryName={lotteryName}
          lotteryNumber={lotteryNumber}
          onClose={closeWinnerModal}
        />
      )}

      {/* Draw Status - shows countdown, waiting for results, or winner */}
      <DrawStatus />

      {/* Onboarding Modal */}
      {config && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={closeOnboarding}
          config={config}
        />
      )}

      {/* Draw Finished Modal - показывается поверх белого бокса с числами */}
      <DrawFinishedModal
        isVisible={isDrawFinishedVisible}
        hasWinner={drawHasWinner}
        winnerNumber={currentDraw?.winner_number}
        drawName={currentDraw?.draw_name}
      />

            {/* Overlay для неактивного лотереи или показа победителя */}
      {(!currentDraw || currentDraw.status !== 'active') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Проверяем, есть ли завершенный розыгрыш с победителем (текущий или последний) */}
                     {((currentDraw?.status === 'finished' && currentDraw?.winner_number) || 
             (!currentDraw && lastFinishedDraw?.winner_number)) ? (
                           // Модальное окно с победителем в стиле DrawFinishedModal
              <div className="relative max-w-sm mx-4">
                {/* Crystal glass эффект контейнер */}
                <div className="shadow-2xl backdrop-blur-sm bg-green-50/95 border-green-300 rounded-xl overflow-hidden">
                  <div className="p-6 text-center space-y-4">
                                       {/* Animated Icons */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" className="animate-pulse">
                          <g clipPath="url(#clip0_3261_13580)">
                            <path d="M19.39 12.54L18.38 12.77C17.66 12.94 17.09 13.5 16.93 14.22L16.7 15.23C16.68 15.34 16.52 15.34 16.5 15.23L16.27 14.22C16.1 13.5 15.54 12.93 14.82 12.77L13.81 12.54C13.7 12.52 13.7 12.36 13.81 12.34L14.82 12.11C15.54 11.94 16.11 11.38 16.27 10.66L16.5 9.65C16.52 9.54 16.68 9.54 16.7 9.65L16.93 10.66C17.1 11.38 17.66 11.95 18.38 12.11L19.39 12.34C19.5 12.36 19.5 12.52 19.39 12.54Z" stroke="#10b981" strokeWidth="1.5" strokeMiterlimit="10" />
                            <path d="M13.47 15.14C13 15.27 12.51 15.34 12 15.34C8.93 15.34 6.44 12.85 6.44 9.78V3.11C6.44 2.5 6.94 2 7.55 2H16.45C17.06 2 17.56 2.5 17.56 3.11V7.08" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6.91001 12H6.45001C4.00001 12 2.01001 10.01 2.01001 7.55998V5.33998C2.01001 4.72998 2.51001 4.22998 3.12001 4.22998H6.45001" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M21.01 10.34C21.62 9.57998 21.99 8.60998 21.99 7.55998V5.33998C21.99 4.72998 21.49 4.22998 20.88 4.22998H17.55" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8.50018 22H7.56003C7.20003 22 6.87003 21.83 6.66003 21.54C6.45003 21.25 6.40003 20.88 6.51003 20.54L6.88003 19.43C7.03003 18.98 7.45003 18.67 7.93003 18.67H16.07H16.08C16.55 18.67 16.98 18.98 17.13 19.43L17.5 20.54C17.62 20.88 17.56 21.25 17.35 21.54C17.14 21.83 16.81 22 16.45 22H12.5002" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 15.33V18.66" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                          <defs>
                            <clipPath id="clip0_3261_13580">
                              <rect width="24" height="24" fill="white"/>
                            </clipPath>
                          </defs>
                        </svg>
                      </div>
                    </div>

                                       {/* Title */}
                    <div className="space-y-2">
                      <div className="text-xs px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full inline-block">
                        ¡🎉 GANADOR ANUNCIADO! 🎉
                      </div>
                      
                      <h2 className="text-xl font-bold text-green-800">
                        {(currentDraw?.status === 'finished' ? currentDraw : lastFinishedDraw)?.draw_name}
                      </h2>
                    </div>

                                       {/* Winner Announcement */}
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-green-700">
                          ¡FELICITACIONES!
                        </h3>
                        
                        <div className="relative">
                          <div className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white text-5xl font-black rounded-xl w-24 h-24 flex items-center justify-center mx-auto shadow-xl relative overflow-hidden">
                            <span className="relative z-10 drop-shadow-lg">22</span>
                            <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent animate-pulse"></div>
                          </div>
                          
                          {/* Floating sparkles around number */}
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className={`absolute animate-pulse ${
                                i === 0 ? '-top-2 -left-2' :
                                i === 1 ? '-top-2 -right-2' :
                                i === 2 ? '-bottom-2 -left-2' :
                                '-bottom-2 -right-2'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2l2.09 6.26L20 9.27l-5 4.87 1.18 6.88L12 17.77l-4.18 3.25L9 14.14 4 9.27l5.91-1.01L12 2z"/>
                              </svg>
                            </div>
                          ))}
                        </div>
                       
                                               <div className="space-y-2">
                          <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-xl p-3">
                            <h4 className="text-lg font-bold text-green-800 mb-1">
                              ¡El número ganador es 22!
                            </h4>
                            <p className="text-green-700 text-xs leading-relaxed">
                              Si tienes este número, <span className="font-bold">¡ERES EL GANADOR!</span>
                              <br />
                              Te contactaremos muy pronto para entregarte tu premio.
                              <br />
                              <span className="font-semibold">¡Muchas felicitaciones! 🎊</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Anuncio de nuevo sorteo */}
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-xl p-3">
                        <p className="text-blue-800 font-bold text-sm">
                          🎯 Un nuevo sorteo comenzará pronto
                        </p>
                        <p className="text-blue-600 text-xs mt-1">
                          Mantente atento para participar en la próxima oportunidad
                        </p>
                      </div>
                    </div>

                                       {/* Decorative elements */}
                    <div className="flex justify-center space-x-1 opacity-60">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
                          style={{ 
                            animationDelay: `${i * 0.2}s`
                          }}
                        />
                      ))}
                    </div>
                 </div>
               </div>
             </div>
          ) : (
            // Модальное окно когда нет активного розыгрыша
            <div className="bg-gradient-to-r from-gray-800/90 via-gray-700/90 to-gray-800/90 text-white rounded-xl p-6 text-center shadow-2xl backdrop-blur-md border border-gray-600 max-w-sm mx-4">
              <div className="mb-4 flex justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <g clipPath="url(#clip0_4418_3131)">
                    <path d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.75 14.4302V9.3702C10.75 8.8902 10.55 8.7002 10.04 8.7002H8.75004C8.24004 8.7002 8.04004 8.8902 8.04004 9.3702V14.4302C8.04004 14.9102 8.24004 15.1002 8.75004 15.1002H10.04C10.55 15.1002 10.75 14.9102 10.75 14.4302Z" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16.0298 14.4302V9.3702C16.0298 8.8902 15.8298 8.7002 15.3198 8.7002H14.0298C13.5198 8.7002 13.3198 8.8902 13.3198 9.3702V14.4302C13.3198 14.9102 13.5198 15.1002 14.0298 15.1002" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <defs>
                    <clipPath id="clip0_4418_3131">
                      <rect width="24" height="24" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Sorteo No Disponible</h3>
              <p className="text-gray-300 leading-relaxed">
                No hay un sorteo activo en este momento. Los números estarán disponibles cuando el administrador inicie un nuevo sorteo.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Confirmation Dialog */}
      <NavigationConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        selectedNumbers={navigationState.selectedNumbers}
      />

    </div>
  );
};

export default Index;
