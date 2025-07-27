import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

type Step = 'number-selection' | 'payment-method' | 'payment-details' | 'payment-form' | 'success';

interface NavigationState {
  currentStep: Step;
  hasActiveReservation: boolean;
  reservationId: string | null;
  selectedNumbers: number[];
}

interface NavigationControls {
  navigationState: NavigationState;
  updateNavigationState: (updates: Partial<NavigationState>) => void;
  isCriticalStep: () => boolean;
  shouldBlockNavigation: () => boolean;
  handleNavigationAttempt: () => Promise<boolean>;
  cleanup: () => void;
  showConfirmDialog: boolean;
  setShowConfirmDialog: (show: boolean) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
}

export const useNavigationControl = (): NavigationControls => {
  const { toast } = useToast();
  
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentStep: 'number-selection',
    hasActiveReservation: false,
    reservationId: null,
    selectedNumbers: []
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Критические шаги, где нужно контролировать навигацию
  const criticalSteps: Step[] = ['payment-method', 'payment-details', 'payment-form'];

  const updateNavigationState = useCallback((updates: Partial<NavigationState>) => {
    setNavigationState(prev => ({ ...prev, ...updates }));
  }, []);

  const isCriticalStep = useCallback((): boolean => {
    return criticalSteps.includes(navigationState.currentStep);
  }, [navigationState.currentStep]);

  const shouldBlockNavigation = useCallback((): boolean => {
    return navigationState.hasActiveReservation && isCriticalStep();
  }, [navigationState.hasActiveReservation, isCriticalStep]);

  // Функция очистки состояния (определяем первой)
  const cleanup = useCallback(() => {
    console.log('🧹 Navigation cleanup triggered');
    
    if (navigationState.hasActiveReservation && navigationState.reservationId) {
      // TODO: Здесь будет вызов API для отмены резервации
      console.log('🔄 Auto-canceling reservation:', navigationState.reservationId);
      
      toast({
        title: "Reserva Cancelada",
        description: "Tu reserva ha sido cancelada automáticamente.",
        variant: "default",
      });
    }

    // Очищаем состояние
    setNavigationState({
      currentStep: 'number-selection',
      hasActiveReservation: false,
      reservationId: null,
      selectedNumbers: []
    });
  }, [navigationState.hasActiveReservation, navigationState.reservationId, toast]);

  // Функция для обработки попытки навигации
  const handleNavigationAttempt = useCallback(async (): Promise<boolean> => {
    if (!shouldBlockNavigation()) {
      return true; // Разрешить навигацию
    }

    // Показываем confirmation dialog
    setShowConfirmDialog(true);
    
    // Возвращаем Promise который разрешится после выбора пользователя
    return new Promise((resolve) => {
      setPendingNavigation(() => () => {
        resolve(true);
      });
    });
  }, [shouldBlockNavigation]);

  // Подтверждение навигации (отмена резервации и переход)
  const confirmNavigation = useCallback(() => {
    console.log('✅ User confirmed navigation - cleaning up reservation');
    
    setShowConfirmDialog(false);
    cleanup();
    
    // Выполняем отложенную навигацию
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [cleanup, pendingNavigation]);

  // Отмена навигации (остаться на странице)
  const cancelNavigation = useCallback(() => {
    console.log('❌ User canceled navigation - staying on page');
    
    setShowConfirmDialog(false);
    setPendingNavigation(null);
    
    toast({
      title: "Reserva Mantenida",
      description: "Tus números siguen reservados. Completa el pago para confirmar.",
      variant: "default",
    });
  }, [toast]);

  // Browser navigation control
  useEffect(() => {
    const handlePopState = async (event: PopStateEvent) => {
      console.log('🔙 Browser back button pressed', { 
        currentStep: navigationState.currentStep,
        hasReservation: navigationState.hasActiveReservation 
      });

      if (shouldBlockNavigation()) {
        // Блокируем навигацию назад
        event.preventDefault();
        window.history.pushState(null, '', window.location.href);
        
        const shouldProceed = await handleNavigationAttempt();
        if (!shouldProceed) {
          console.log('🚫 Navigation blocked');
          return;
        }
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldBlockNavigation()) {
        console.log('⚠️ Page unload attempt with active reservation');
        
        // Стандартное сообщение браузера
        const message = '¿Estás seguro de que quieres salir? Tienes números reservados.';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    // Добавляем слушатели событий
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Устанавливаем начальное состояние истории
    if (shouldBlockNavigation()) {
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigationState, shouldBlockNavigation, handleNavigationAttempt]);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      if (navigationState.hasActiveReservation) {
        cleanup();
      }
    };
  }, []);

  return {
    navigationState,
    updateNavigationState,
    isCriticalStep,
    shouldBlockNavigation,
    handleNavigationAttempt,
    cleanup,
    showConfirmDialog,
    setShowConfirmDialog,
    confirmNavigation,
    cancelNavigation
  };
}; 