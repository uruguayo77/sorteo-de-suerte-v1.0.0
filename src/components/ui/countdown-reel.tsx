import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLotteryStore } from "@/lib/lotteryStore";
import { useActiveLotteryDraw } from "@/hooks/use-supabase";

interface TimeDisplay {
  hours: string;
  minutes: string;
  seconds: string;
  ampm: string;
}

const CountdownReel = () => {
  const { 
    isActive, 
    isPaused, 
    isCompleted, 
    lotteryName, 
    prizeAmount, 
    getRemainingTime,
    completeLottery,
    endTime
  } = useLotteryStore();

  // Получаем активный розыгрыш из базы данных
  const { data: currentDraw } = useActiveLotteryDraw();

  const [currentTime, setCurrentTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const prevTimeRef = useRef({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Проверяем, есть ли активный розыгрыш
  const hasActiveDraw = (currentDraw && currentDraw.status === 'active') || isActive;

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Проверяем активный розыгрыш из базы данных
      if (currentDraw && currentDraw.status === 'active' && currentDraw.end_date) {
        const now = new Date();
        const endDate = new Date(currentDraw.end_date);
        const remainingMs = endDate.getTime() - now.getTime();
        
        if (remainingMs > 0) {
          const totalSeconds = Math.floor(remainingMs / 1000);
          const days = Math.floor(totalSeconds / (24 * 3600));
          const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          setCurrentTime({
            days,
            hours,
            minutes,
            seconds
          });
        } else {
          // Время истекло
          setCurrentTime({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0
          });
        }
        return;
      }

      // Если нет активного розыгрыша в БД, останавливаем таймер
      if (!currentDraw || currentDraw.status !== 'active') {
        // Не обновляем время - оставляем последнее значение или показываем -- 
        return;
      }

      // Если нет активного розыгрыша в БД, используем Zustand store
      if (!isActive || isPaused || isCompleted) {
        setCurrentTime({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
        return;
      }

      const remainingMs = getRemainingTime();
      
      if (remainingMs > 0) {
        const totalSeconds = Math.floor(remainingMs / 1000);
        const days = Math.floor(totalSeconds / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        setCurrentTime({
          days,
          hours,
          minutes,
          seconds
        });
      } else if (isActive && !isCompleted) {
        // Время истекло - автоматически завершаем розыгрыш
        completeLottery();
        setCurrentTime({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
      } else {
        // Время истекло
        setCurrentTime({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
      }
    };

    calculateTimeLeft();
    
    // Только запускаем интервал если есть активный розыгрыш
    let timer: NodeJS.Timeout | null = null;
    if (hasActiveDraw) {
      timer = setInterval(calculateTimeLeft, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, isPaused, isCompleted, getRemainingTime, currentDraw, completeLottery, hasActiveDraw]);

  // Получаем текущие цифры
  const daysStr = hasActiveDraw ? currentTime.days.toString().padStart(2, '0') : '--';
  const hoursStr = hasActiveDraw ? currentTime.hours.toString().padStart(2, '0') : '--';
  const minutesStr = hasActiveDraw ? currentTime.minutes.toString().padStart(2, '0') : '--';
  const secondsStr = hasActiveDraw ? currentTime.seconds.toString().padStart(2, '0') : '--';

  const currentDigits = {
    days1: daysStr[0],
    days2: daysStr[1],
    hours1: hoursStr[0],
    hours2: hoursStr[1],
    minutes1: minutesStr[0],
    minutes2: minutesStr[1],
    seconds1: secondsStr[0],
    seconds2: secondsStr[1]
  };

  // Получаем предыдущие цифры
  const prevDaysStr = prevTimeRef.current.days.toString().padStart(2, '0');
  const prevHoursStr = prevTimeRef.current.hours.toString().padStart(2, '0');
  const prevMinutesStr = prevTimeRef.current.minutes.toString().padStart(2, '0');
  const prevSecondsStr = prevTimeRef.current.seconds.toString().padStart(2, '0');

  const prevDigits = {
    days1: prevDaysStr[0],
    days2: prevDaysStr[1],
    hours1: prevHoursStr[0],
    hours2: prevHoursStr[1],
    minutes1: prevMinutesStr[0],
    minutes2: prevMinutesStr[1],
    seconds1: prevSecondsStr[0],
    seconds2: prevSecondsStr[1]
  };

  // Обновляем предыдущие значения после рендера
  useEffect(() => {
    prevTimeRef.current = { ...currentTime };
  }, [currentTime]);

  const ReelDigit = ({ digit, shouldAnimate = true }: { digit: string; shouldAnimate?: boolean }) => (
    <div className="relative h-12 w-8 sm:h-16 sm:w-12 bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
        {shouldAnimate ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={digit}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25,
                duration: 0.4
              }}
              className="absolute inset-0 flex items-center justify-center text-lg sm:text-2xl font-bold text-white"
            >
              {digit}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-lg sm:text-2xl font-bold text-white">
            {digit}
          </div>
        )}
        
        {/* Decorative lines to simulate reel effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gray-600 opacity-50"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-600 opacity-50"></div>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-500 opacity-30 transform -translate-y-1/2"></div>
      </div>
  );

  const Separator = ({ char }: { char: string }) => (
    <div className="flex items-end pb-2 sm:pb-4">
      <span className="text-lg sm:text-2xl font-bold text-white mx-0.5 sm:mx-1">{char}</span>
    </div>
  );

  return (
    <div 
      className="flex flex-col items-center space-y-4 py-6 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 px-4 mx-2 mb-6 sm:px-8 sm:py-6 sm:space-y-4 sm:mx-4 sm:mb-8"
      style={{
        borderRadius: '30px'
      }}
    >
      <div className="text-center">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
          {hasActiveDraw ? "Tiempo restante" : "Esperando Sorteo"}
        </h3>
        <p className="text-xs sm:text-sm text-gray-300">
          {hasActiveDraw 
            ? "Sorteo en progreso" 
            : "El sorteo no ha comenzado"
          }
        </p>
      </div>
      
      <div className="flex items-end space-x-2 sm:space-x-2">
        {/* Days - только показываем если больше 0 */}
        {currentTime.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <span className="text-xs text-white mb-1 font-medium">D</span>
              <div className="flex space-x-1">
                <ReelDigit 
                  digit={currentDigits.days1} 
                  shouldAnimate={currentDigits.days1 !== prevDigits.days1}
                />
                <ReelDigit 
                  digit={currentDigits.days2} 
                  shouldAnimate={currentDigits.days2 !== prevDigits.days2}
                />
              </div>
            </div>
            <Separator char=":" />
          </>
        )}
        
        {/* Hours */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-white mb-1 font-medium">H</span>
          <div className="flex space-x-1">
            <ReelDigit 
              digit={currentDigits.hours1} 
              shouldAnimate={currentDigits.hours1 !== prevDigits.hours1}
            />
            <ReelDigit 
              digit={currentDigits.hours2} 
              shouldAnimate={currentDigits.hours2 !== prevDigits.hours2}
            />
          </div>
        </div>
        
        <Separator char=":" />
        
        {/* Minutes */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-white mb-1 font-medium">M</span>
          <div className="flex space-x-1">
            <ReelDigit 
              digit={currentDigits.minutes1} 
              shouldAnimate={currentDigits.minutes1 !== prevDigits.minutes1}
            />
            <ReelDigit 
              digit={currentDigits.minutes2} 
              shouldAnimate={currentDigits.minutes2 !== prevDigits.minutes2}
            />
          </div>
        </div>
        
        <Separator char=":" />
        
        {/* Seconds */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-white mb-1 font-medium">S</span>
          <div className="flex space-x-1">
            <ReelDigit 
              digit={currentDigits.seconds1} 
              shouldAnimate={currentDigits.seconds1 !== prevDigits.seconds1}
            />
            <ReelDigit 
              digit={currentDigits.seconds2} 
              shouldAnimate={currentDigits.seconds2 !== prevDigits.seconds2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownReel; 