import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownReelProps {
  targetDate?: Date;
}

interface TimeDisplay {
  hours: string;
  minutes: string;
  seconds: string;
  ampm: string;
}

const CountdownReel = ({ targetDate }: CountdownReelProps) => {
  const [currentTime, setCurrentTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    ampm: "AM"
  });
  
  const prevTimeRef = useRef({
    hours: 0,
    minutes: 0,
    seconds: 0,
    ampm: "AM"
  });

  // Если не передана целевая дата, устанавливаем следующий день в 20:00
  const getTargetDate = () => {
    if (targetDate) return targetDate;
    
    const now = new Date();
    const target = new Date();
    target.setHours(20, 0, 0, 0); // 8:00 PM
    
    // Если уже прошло 20:00 сегодня, устанавливаем на завтра
    if (now > target) {
      target.setDate(target.getDate() + 1);
    }
    
    return target;
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = getTargetDate();
      const now = new Date();
      const difference = target.getTime() - now.getTime();

      if (difference > 0) {
        const totalHours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        // Конвертируем в 12-часовой формат
        let displayHours = totalHours;
        let ampm = "AM";
        
        if (totalHours === 0) {
          displayHours = 12;
        } else if (totalHours > 12) {
          displayHours = totalHours - 12;
          ampm = "PM";
        } else if (totalHours === 12) {
          ampm = "PM";
        }

        setCurrentTime({
          hours: displayHours,
          minutes: minutes,
          seconds: seconds,
          ampm: ampm
        });
      } else {
        // Если время истекло, сбрасываем на следующий день
        setCurrentTime({
          hours: 12,
          minutes: 0,
          seconds: 0,
          ampm: "AM"
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Получаем текущие цифры
  const hoursStr = currentTime.hours.toString().padStart(2, '0');
  const minutesStr = currentTime.minutes.toString().padStart(2, '0');
  const secondsStr = currentTime.seconds.toString().padStart(2, '0');

  const currentDigits = {
    hours1: hoursStr[0],
    hours2: hoursStr[1],
    minutes1: minutesStr[0],
    minutes2: minutesStr[1],
    seconds1: secondsStr[0],
    seconds2: secondsStr[1],
    ampm: currentTime.ampm
  };

  // Получаем предыдущие цифры
  const prevHoursStr = prevTimeRef.current.hours.toString().padStart(2, '0');
  const prevMinutesStr = prevTimeRef.current.minutes.toString().padStart(2, '0');
  const prevSecondsStr = prevTimeRef.current.seconds.toString().padStart(2, '0');

  const prevDigits = {
    hours1: prevHoursStr[0],
    hours2: prevHoursStr[1],
    minutes1: prevMinutesStr[0],
    minutes2: prevMinutesStr[1],
    seconds1: prevSecondsStr[0],
    seconds2: prevSecondsStr[1],
    ampm: prevTimeRef.current.ampm
  };

  // Обновляем предыдущие значения после рендера
  useEffect(() => {
    prevTimeRef.current = { ...currentTime };
  }, [currentTime]);

  const ReelDigit = ({ digit, label, shouldAnimate = true }: { digit: string; label?: string; shouldAnimate?: boolean }) => (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs text-white mb-1 font-medium">{label}</span>
      )}
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
    </div>
  );

     const Separator = ({ char }: { char: string }) => (
    <div className="flex items-end pb-2 sm:pb-4">
      <span className="text-lg sm:text-2xl font-bold text-white mx-0.5 sm:mx-1">{char}</span>
    </div>
  );

     return (
    <div 
      className="flex flex-col items-center space-y-3 py-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 px-4 mx-2 mb-6 sm:px-8 sm:py-6 sm:space-y-4 sm:mx-4 sm:mb-8"
      style={{
        borderRadius: '50px'
      }}
    >
             <div className="text-center">
         <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
           Próximo Sorteo
         </h3>
         <p className="text-xs sm:text-sm text-gray-300">
           Tiempo restante
         </p>
       </div>
      
             <div className="flex items-end space-x-1 sm:space-x-2">
        {/* Hours */}
        <ReelDigit 
          digit={currentDigits.hours1} 
          label="H" 
          shouldAnimate={currentDigits.hours1 !== prevDigits.hours1}
        />
        <ReelDigit 
          digit={currentDigits.hours2} 
          shouldAnimate={currentDigits.hours2 !== prevDigits.hours2}
        />
        
        <Separator char=":" />
        
        {/* Minutes */}
        <ReelDigit 
          digit={currentDigits.minutes1} 
          label="M" 
          shouldAnimate={currentDigits.minutes1 !== prevDigits.minutes1}
        />
        <ReelDigit 
          digit={currentDigits.minutes2} 
          shouldAnimate={currentDigits.minutes2 !== prevDigits.minutes2}
        />
        
        <Separator char=":" />
        
        {/* Seconds */}
        <ReelDigit 
          digit={currentDigits.seconds1} 
          label="S" 
          shouldAnimate={currentDigits.seconds1 !== prevDigits.seconds1}
        />
        <ReelDigit 
          digit={currentDigits.seconds2} 
          shouldAnimate={currentDigits.seconds2 !== prevDigits.seconds2}
        />
        
                 {/* AM/PM */}
         <div className="flex flex-col items-center ml-2 sm:ml-3">
           <span className="text-xs text-white mb-1 font-medium">Period</span>
           <div className="relative h-12 w-8 sm:h-16 sm:w-12 bg-purple-600 rounded-lg overflow-hidden shadow-lg">
            {currentDigits.ampm !== prevDigits.ampm ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentDigits.ampm}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    duration: 0.4
                  }}
                                     className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-bold text-white"
                >
                  {currentDigits.ampm}
                </motion.div>
              </AnimatePresence>
            ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-bold text-white">
                {currentDigits.ampm}
              </div>
            )}
            
            {/* Decorative lines */}
            <div className="absolute top-0 left-0 right-0 h-px bg-purple-400 opacity-50"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-purple-400 opacity-50"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-purple-300 opacity-30 transform -translate-y-1/2"></div>
          </div>
        </div>
      </div>
      
             <div className="text-center">
         <p className="text-xs sm:text-sm text-gray-300">
           Cada sorteo a las 8:00 PM
         </p>
       </div>
    </div>
  );
};

export default CountdownReel; 