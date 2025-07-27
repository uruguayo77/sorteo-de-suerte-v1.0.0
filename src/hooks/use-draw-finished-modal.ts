import { useState, useEffect } from 'react';
import { useActiveLotteryStats, useActiveLotteryDraw } from './use-supabase';

export const useDrawFinishedModal = () => {
  const { data: stats } = useActiveLotteryStats();
  const { data: activeLottery } = useActiveLotteryDraw();
  const [hasShownFinishedModal, setHasShownFinishedModal] = useState(false);

  // Определяем есть ли победитель
  const hasWinner = Boolean(
    activeLottery?.status === 'finished' && 
    activeLottery?.winner_number
  );

  // ИСПРАВЛЕНО: Определяем видимость модального окна только для approved номеров
  // Модальное окно показывается только когда ВСЕ номера проданы И оплачены (approved)
  const isVisible = Boolean(
    stats?.allNumbersSold && // Теперь это базируется на approved номерах
    activeLottery?.status && 
    ['active', 'finished'].includes(activeLottery.status)
  );

  // Сбрасываем флаг при смене розыгрыша или когда модалка не видна
  useEffect(() => {
    if (!isVisible || activeLottery?.id) {
      setHasShownFinishedModal(false);
    }
  }, [isVisible, activeLottery?.id]);

  // Специальная логика для отслеживания показа первого состояния
  useEffect(() => {
    if (isVisible && !hasWinner && !hasShownFinishedModal) {
      setHasShownFinishedModal(true);
    }
  }, [isVisible, hasWinner, hasShownFinishedModal]);

  // Автоматически показываем модалку с победителем, когда он появляется
  const shouldShowWinnerModal = Boolean(hasWinner && isVisible);

  console.log('🎯 DrawFinishedModal State:', {
    isVisible,
    hasWinner,
    shouldShowWinnerModal,
    allNumbersSold: stats?.allNumbersSold,
    approvedNumbers: stats?.approvedNumbers,
    blockedNumbers: stats?.blockedNumbers,
    lotteryStatus: activeLottery?.status,
    winnerNumber: activeLottery?.winner_number,
    hasShownFinishedModal
  });

  return {
    isVisible,
    hasWinner,
    shouldShowWinnerModal
  };
}; 