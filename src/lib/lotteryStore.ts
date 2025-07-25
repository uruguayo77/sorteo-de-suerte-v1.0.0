import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

export interface LotteryHistory {
  id: string;
  lotteryNumber: number; // Номер розыгрыша для отслеживания
  name: string;
  prizeAmount: string;
  startTime: Date;
  endTime: Date;
  plannedDuration: number; // в минутах
  actualDuration: number; // в минутах
  winnerNumber: number | null;
  status: 'completed' | 'cancelled' | 'no_winner';
  totalParticipants: number;
  participantNumbers: number[]; // числа которые выбрали участники
  reason?: string; // причина отмены или комментарий
}

export interface LotteryState {
  // Состояние розыгрыша
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  
  // Настройки таймера
  endTime: Date | null;
  startTime: Date | null;
  duration: number; // в минутах
  
  // Данные розыгрыша
  lotteryNumber: number; // Номер текущего розыгрыша
  lotteryName: string;
  prizeAmount: string;
  selectedNumbers: number[];
  winnerNumber: number | null;
  activeLotteryId: string | null; // ID активного розыгрыша в БД
  
  // Модальное окно победителя
  showWinnerModal: boolean;
  
  // История розыгрышей (кэш)
  history: LotteryHistory[];
  isHistoryLoading: boolean;
  
  // Действия
  startLottery: (name: string, prize: string, durationMinutes: number) => Promise<void>;
  pauseLottery: () => Promise<void>;
  resumeLottery: () => Promise<void>;
  stopLottery: () => Promise<void>;
  restartLottery: () => Promise<void>;
  setWinner: (number: number) => Promise<void>;
  completeLottery: () => Promise<void>;
  cancelLottery: (reason?: string) => Promise<void>;
  deleteLottery: () => Promise<void>;
  resetLottery: () => void;
  
  // Управление выбранными номерами
  updateSelectedNumbers: (numbers: number[]) => Promise<void>;
  
  // Управление модальным окном победителя
  openWinnerModal: () => void;
  closeWinnerModal: () => void;
  
  // Управление временем
  setDuration: (minutes: number) => void;
  addTime: (minutes: number) => Promise<void>;
  subtractTime: (minutes: number) => Promise<void>;
  
  // Получение оставшегося времени
  getRemainingTime: () => number;
  
  // Управление историей с синхронизацией
  loadHistory: () => Promise<void>;
  getHistory: () => LotteryHistory[];
  clearHistory: () => Promise<void>;
  
  // Инициализация и синхронизация
  initializeFromDatabase: () => Promise<void>;
  syncWithDatabase: () => Promise<void>;
}

export const useLotteryStore = create<LotteryState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      isActive: false,
      isPaused: false,
      isCompleted: false,
      endTime: null,
      startTime: null,
      duration: 60, // будет загружено из lottery_settings при инициализации
      lotteryNumber: 0, // Добавляем поле для номера розыгрыша
      lotteryName: '',
      prizeAmount: '',
      selectedNumbers: [],
      winnerNumber: null,
      activeLotteryId: null,
      showWinnerModal: false,
      history: [],
      isHistoryLoading: false,

      // Инициализация из базы данных
      initializeFromDatabase: async () => {
        console.log('🔄 Инициализация из базы данных...')
        try {
          // Проверяем подключение
          const isConnected = await SupabaseService.testConnection();
          if (!isConnected) {
            console.warn('⚠️ Нет подключения к Supabase, работаем оффлайн');
            return;
          }

          // Загружаем настройки по умолчанию из lottery_settings
          try {
            const { data: defaultDurationSetting } = await supabase
              .from('lottery_settings')
              .select('setting_value')
              .eq('setting_key', 'default_duration_minutes')
              .single();
            
            if (defaultDurationSetting) {
              const defaultDuration = parseInt(defaultDurationSetting.setting_value) || 60;
              set(state => ({ ...state, duration: defaultDuration }));
              console.log('✅ Настройки по умолчанию загружены, duration:', defaultDuration);
            }
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить настройки по умолчанию:', error);
          }

          // Загружаем активный розыгрыш
          const activeLottery = await SupabaseService.getActiveLottery();
          if (activeLottery) {
            set({
              isActive: activeLottery.is_active,
              isPaused: activeLottery.is_paused,
              isCompleted: activeLottery.is_completed,
              lotteryNumber: activeLottery.lottery_number, // Загружаем номер розыгрыша
              lotteryName: activeLottery.name,
              prizeAmount: activeLottery.prize_amount,
              duration: activeLottery.duration_minutes,
              startTime: new Date(activeLottery.start_time),
              endTime: new Date(activeLottery.end_time),
              winnerNumber: activeLottery.winner_number,
              selectedNumbers: activeLottery.selected_numbers || [],
              activeLotteryId: activeLottery.id
            });
            
            console.log('✅ Активный розыгрыш загружен:', activeLottery.name);
          }

          // Загружаем историю
          await get().loadHistory();
          
          console.log('✅ Инициализация завершена');
        } catch (error) {
          console.error('❌ Ошибка инициализации:', error);
        }
      },

      // Синхронизация с базой данных
      syncWithDatabase: async () => {
        try {
          const state = get();
          if (!state.activeLotteryId) return;

          await SupabaseService.updateActiveLottery({
            is_active: state.isActive,
            is_paused: state.isPaused,
            is_completed: state.isCompleted,
            winner_number: state.winnerNumber,
            selected_numbers: state.selectedNumbers,
            end_time: state.endTime?.toISOString()
          });
        } catch (error) {
          console.error('❌ Ошибка синхронизации:', error);
        }
      },

      // Начало розыгрыша
      startLottery: async (name: string, prizeAmount: string, duration: number) => {
        console.log('🎯 lotteryStore.startLottery вызван с параметрами:', { name, prizeAmount, duration });
        
        const startTime = new Date()
        const endTime = new Date(startTime.getTime() + duration * 60000) // минуты в миллисекунды
        
        console.log('📅 Рассчитанное время:', { 
          startTime: startTime.toISOString(), 
          endTime: endTime.toISOString(),
          durationMs: duration * 60000
        });

        try {
          console.log('🔗 Создаем активный розыгрыш в БД...');
          
          // Создаем активный розыгрыш в БД
          const lotteryId = await SupabaseService.createActiveLottery({
            name,
            prize_amount: prizeAmount,
            start_time: startTime,
            end_time: endTime,
            duration_minutes: duration
          });

          console.log('📝 SupabaseService.createActiveLottery вернул:', lotteryId);

          if (!lotteryId) {
            console.error('❌ Не удалось создать розыгрыш в БД - lotteryId пустой');
            return;
          }

          console.log('💾 Обновляем локальное состояние...');
          
          set({
            isActive: true,
            isPaused: false,
            isCompleted: false,
            lotteryNumber: get().lotteryNumber + 1, // Увеличиваем номер розыгрыша
            lotteryName: name,
            prizeAmount: prizeAmount,
            duration: duration,
            startTime: startTime,
            endTime: endTime,
            winnerNumber: null,
            selectedNumbers: [],
            activeLotteryId: lotteryId
          });

          console.log('✅ Розыгрыш запущен и сохранен в БД:', name);
          console.log('🎲 Текущее состояние store:', get());
        } catch (error) {
          console.error('❌ Ошибка при запуске розыгрыша в store:', error);
          console.error('📊 Stack trace:', error.stack);
          throw error; // Пробрасываем ошибку дальше
        }
      },

      // Остановка розыгрыша
      stopLottery: async () => {
        try {
          const { lotteryName } = get();
          
          // Завершаем активный розыгрыш в БД
          const success = await SupabaseService.completeActiveLottery(
            null, 
            'cancelled', 
            'Розыгрыш остановлен администратором'
          );

          if (success) {
            set({
              isActive: false,
              isPaused: false,
              isCompleted: true,
              activeLotteryId: null
            });

            // Перезагружаем историю
            await get().loadHistory();

            console.log('✅ Розыгрыш остановлен и сохранен в историю');
          } else {
            console.error('❌ Ошибка при остановке розыгрыша');
          }
        } catch (error) {
          console.error('❌ Ошибка в stopLottery:', error);
        }
      },

      // Пауза розыгрыша
      pauseLottery: async () => {
        try {
          const success = await SupabaseService.updateActiveLottery({ 
            is_paused: true 
          });

          if (success) {
            set({ isPaused: true });
            console.log('✅ Розыгрыш поставлен на паузу');
          }
        } catch (error) {
          console.error('❌ Ошибка в pauseLottery:', error);
        }
      },

      // Возобновление розыгрыша
      resumeLottery: async () => {
        try {
          const success = await SupabaseService.updateActiveLottery({ 
            is_paused: false 
          });

          if (success) {
            set({ isPaused: false });
            console.log('✅ Розыгрыш возобновлен');
          }
        } catch (error) {
          console.error('❌ Ошибка в resumeLottery:', error);
        }
      },

      // Перезапуск розыгрыша
      restartLottery: async () => {
        try {
          const { lotteryName, prizeAmount, duration } = get();
          
          // Сначала останавливаем текущий
          await get().stopLottery();
          
          // Затем запускаем новый с теми же параметрами
          await get().startLottery(lotteryName, prizeAmount, duration);
          
          console.log('✅ Розыгрыш перезапущен');
        } catch (error) {
          console.error('❌ Ошибка в restartLottery:', error);
        }
      },

      // Установка победителя
      setWinner: async (winnerNumber: number) => {
        try {
          // Обновляем в БД
          const success = await SupabaseService.updateActiveLottery({ 
            winner_number: winnerNumber,
            is_completed: true, // Автоматически завершаем розыгрыш
            is_active: false // Останавливаем активный розыгрыш
          });
 
          if (success) {
            set({ 
              winnerNumber,
              isCompleted: true,
              isActive: false, // Останавливаем таймер
              showWinnerModal: true // Показываем модальное окно
            });
            
            // Завершаем розыгрыш и переносим в историю
            await SupabaseService.completeActiveLottery(
              winnerNumber,
              'completed',
              undefined
            );
            
            // Сбрасываем выбранные числа
            await get().updateSelectedNumbers([]);
            
            // Перезагружаем историю
            await get().loadHistory();
            
            console.log('✅ Победитель установлен и розыгрыш завершен:', winnerNumber);
          }
        } catch (error) {
          console.error('❌ Ошибка в setWinner:', error);
        }
      },

      // Завершение розыгрыша
      completeLottery: async () => {
        try {
          const { winnerNumber } = get();
          
          // Завершаем в БД
          const success = await SupabaseService.completeActiveLottery(
            winnerNumber,
            winnerNumber ? 'completed' : 'no_winner',
            winnerNumber ? undefined : 'Розыгрыш завершен без победителя'
          );

          if (success) {
            set({
              isActive: false,
              isPaused: false,
              isCompleted: true,
              activeLotteryId: null
            });

            // Перезагружаем историю
            await get().loadHistory();

            console.log('✅ Розыгрыш завершен');
          }
        } catch (error) {
          console.error('❌ Ошибка в completeLottery:', error);
        }
      },

      // Удаление текущего розыгрыша
      deleteLottery: async () => {
        try {
          const { isActive } = get();
          
          if (!isActive) {
            console.warn('⚠️ Нет активного розыгрыша для удаления');
            return;
          }

          // Удаляем активный розыгрыш из БД
          const success = await SupabaseService.deleteActiveLottery();

          if (success) {
            // Сбрасываем состояние
            set({
              isActive: false,
              isPaused: false,
              isCompleted: false,
              endTime: null,
              startTime: null,
              lotteryName: '',
              prizeAmount: '',
              selectedNumbers: [],
              winnerNumber: null,
              activeLotteryId: null,
              showWinnerModal: false
            });

            console.log('✅ Розыгрыш удален');
          }
        } catch (error) {
          console.error('❌ Ошибка в deleteLottery:', error);
          throw error;
        }
      },

      // Обновление выбранных номеров
      updateSelectedNumbers: async (numbers: number[]) => {
        try {
          // Обновляем в БД
          const success = await SupabaseService.updateActiveLottery({ 
            selected_numbers: numbers 
          });

          if (success) {
            set({ selectedNumbers: numbers });
            console.log('✅ Выбранные номера обновлены:', numbers);
          }
        } catch (error) {
          console.error('❌ Ошибка в updateSelectedNumbers:', error);
        }
      },

      // Удаление записи из истории
      deleteHistoryEntry: async (id: string) => {
        try {
          const success = await SupabaseService.deleteHistoryEntry(id);
          
          if (success) {
            set((state) => ({
              history: state.history.filter(entry => entry.id !== id)
            }));
            console.log('✅ Запись удалена из истории:', id);
          }
        } catch (error) {
          console.error('❌ Ошибка в deleteHistoryEntry:', error);
        }
      },

      // Сброс всего
      resetLottery: () => {
        set({
          isActive: false,
          isPaused: false,
          isCompleted: false,
          endTime: null,
          startTime: null,
          duration: 60,
          lotteryNumber: 0, // Сбрасываем номер розыгрыша
          lotteryName: '',
          prizeAmount: '',
          selectedNumbers: [],
          winnerNumber: null,
          activeLotteryId: null,
          showWinnerModal: false // Закрываем модальное окно
        });
      },

      // Установка длительности
      setDuration: (minutes: number) => {
        set({ duration: minutes });
      },

      // Добавление времени с синхронизацией
      addTime: async (minutes: number) => {
        const state = get();
        if (state.endTime) {
          const newEndTime = new Date(state.endTime);
          newEndTime.setMinutes(newEndTime.getMinutes() + minutes);
          set({ endTime: newEndTime });
          
          // Синхронизируем с БД
          await get().syncWithDatabase();
        }
      },

      // Убавление времени с синхронизацией
      subtractTime: async (minutes: number) => {
        const state = get();
        if (state.endTime) {
          const newEndTime = new Date(state.endTime);
          newEndTime.setMinutes(newEndTime.getMinutes() - minutes);
          
          // Не позволяем установить время в прошлое
          if (newEndTime > new Date()) {
            set({ endTime: newEndTime });
            
            // Синхронизируем с БД
            await get().syncWithDatabase();
          }
        }
      },

      // Получение оставшегося времени в миллисекундах
      getRemainingTime: () => {
        const state = get();
        if (!state.endTime || !state.isActive || state.isPaused) return 0;
        
        const now = new Date().getTime();
        const end = new Date(state.endTime).getTime();
        const remaining = end - now;
        
        return remaining > 0 ? remaining : 0;
      },

      // Загрузка истории из БД
      loadHistory: async () => {
        console.log('🔄 Загрузка истории из БД...')
        set({ isHistoryLoading: true })
        try {
          const history = await SupabaseService.getLotteryHistory();
          set({ history, isHistoryLoading: false });
          
          console.log(`✅ История загружена: ${history.length} записей`);
        } catch (error) {
          console.error('❌ Ошибка загрузки истории:', error)
          set({ isHistoryLoading: false })
        }
      },

      // Получение истории (из кэша)
      getHistory: () => {
        const state = get();
        return state.history;
      },

      // Очистка истории с синхронизацией
      clearHistory: async () => {
        try {
          const success = await SupabaseService.clearHistory();
          
          if (success) {
            set({ history: [] });
            console.log('✅ История очищена в БД и локально');
          }
        } catch (error) {
          console.error('❌ Ошибка очистки истории:', error);
        }
      },

      // Открытие модального окна победителя
      openWinnerModal: () => {
        set({ showWinnerModal: true });
      },

      // Закрытие модального окна победителя
      closeWinnerModal: () => {
        set({ showWinnerModal: false });
      }
    }),
    {
      name: 'lottery-storage',
      skipHydration: true,
      // Исключаем некоторые поля из локального хранения
      partialize: (state) => ({
        duration: state.duration,
        // Не сохраняем activeData, всегда загружаем из БД
      })
    }
  )
);

// Автоматическая инициализация при создании store
// Инициализируем после гидратации
if (typeof window !== 'undefined') {
  // Даем время на гидратацию и затем инициализируем
  setTimeout(() => {
    useLotteryStore.getState().initializeFromDatabase();
  }, 100);
} 