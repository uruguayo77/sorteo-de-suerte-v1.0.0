import React from 'react'
import { useLotteryStore } from '../lib/lotteryStore'
import { useBlockedNumbersForDraw, useActiveLotteryDraw } from '../hooks/use-supabase'
import { useLotterySetting } from '@/hooks/use-supabase'

interface NumberGridProps {
  selectedNumbers: number[]
  onNumberSelect: (number: number) => void
  allowMultiple?: boolean
}

const NumberGrid = ({ selectedNumbers, onNumberSelect }: NumberGridProps) => {
  const { data: currentDraw } = useActiveLotteryDraw();
  const { updateSelectedNumbers } = useLotteryStore();
  
  // Проверяем, есть ли активный розыгрыш
  const hasActiveDraw = currentDraw && currentDraw.status === 'active'
  const isLotteryInactive = !hasActiveDraw
  
  // Получаем заблокированные номера только для текущего активного розыгрыша
  const { data: blockedNumbers, isLoading, error } = useBlockedNumbersForDraw(
    hasActiveDraw ? currentDraw.id : null
  );
  
  // Получаем количество номеров из настроек с fallback
  const { data: maxNumbersSetting, error: settingsError } = useLotterySetting('max_numbers');
  
  // Используем fallback если настройки недоступны
  const maxNumbers = maxNumbersSetting && !settingsError ? 
    parseInt(maxNumbersSetting.setting_value) : 100; // fallback к 100
  
  const numbers = Array.from({ length: maxNumbers }, (_, i) => i + 1)

  const handleNumberClick = (number: number) => {
    // Блокируем выбор номеров если нет активного розыгрыша
    if (isLotteryInactive) return
    
    onNumberSelect(number)
    updateSelectedNumbers(selectedNumbers.includes(number) 
      ? selectedNumbers.filter(n => n !== number)
      : [...selectedNumbers, number]
    )
  }



  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando números...</p>
      </div>
    )
  }

  if (error) {
    console.error('Error loading blocked numbers:', error)
  }

  // blockedNumbers уже является Set, поэтому просто используем его или создаем пустой Set
  const blockedNumbersSet = blockedNumbers || new Set()
  


  return (
    <div className="w-full max-w-full mx-auto overflow-hidden">
      <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-5 sm:gap-3 p-3 sm:p-3 number-grid-landscape">
        {numbers.map((number) => {
        const isSelected = selectedNumbers.includes(number)
        const isBlocked = blockedNumbersSet.has(number)
        const isDisabled = isBlocked || isLotteryInactive
        
        return (
          <button
            key={number}
            onClick={() => !isDisabled && handleNumberClick(number)}
            disabled={isDisabled}
            className={`
              group relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 ease-out transform
              ${isSelected 
                ? `
                  bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 
                  text-white shadow-xl shadow-purple-500/40 
                  scale-105 sm:scale-110 rotate-1 
                  border-2 border-purple-400/50
                  hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-[1.1] sm:hover:scale-[1.15]
                  before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl before:bg-gradient-to-t before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity
                ` 
                : isLotteryInactive
                ? `
                  bg-gradient-to-br from-gray-100/10 via-gray-200/8 to-gray-100/10 
                  border-2 border-gray-400/20 text-gray-400/50 
                  cursor-not-allowed opacity-40 backdrop-blur-sm
                `
                : isBlocked
                ? `
                  bg-gradient-to-br from-red-100/20 via-pink-100/15 to-red-200/20 
                  border-2 border-red-300/30 text-red-400/70 
                  cursor-not-allowed opacity-60 backdrop-blur-sm
                `
                : `
                  bg-gradient-to-br from-white via-gray-50 to-white 
                  border-2 border-purple-200/50 text-purple-700 
                  shadow-lg shadow-black/10 
                  hover:shadow-xl hover:shadow-purple-500/20 
                  hover:scale-105 hover:border-purple-400/70 hover:bg-gradient-to-br hover:from-purple-50 hover:via-white hover:to-purple-50
                  hover:text-purple-800 hover:-translate-y-0.5
                  active:scale-95 active:shadow-md
                  backdrop-blur-sm
                `
              }
              
              ${!isDisabled && !isSelected ? 'hover:rotate-1' : ''}
            `}
          >
            <span className={`
              relative z-10 font-extrabold tracking-tight
              ${isSelected ? 'drop-shadow-sm' : ''}
            `}>
              {number}
            </span>
            
            {/* Блокированная линия - только для заблокированных, не для неактивных */}
            {isBlocked && !isLotteryInactive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-0.5 sm:w-8 sm:h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent rotate-45 shadow-sm"></div>
                <div className="w-6 h-0.5 sm:w-8 sm:h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent -rotate-45 shadow-sm absolute"></div>
              </div>
            )}
            
            {/* Икона паузы для неактивного розыгрыша */}
            {isLotteryInactive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-40">
                  <g clipPath="url(#clip0_4418_3131_small)">
                    <path d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.75 14.4302V9.3702C10.75 8.8902 10.55 8.7002 10.04 8.7002H8.75004C8.24004 8.7002 8.04004 8.8902 8.04004 9.3702V14.4302C8.04004 14.9102 8.24004 15.1002 8.75004 15.1002H10.04C10.55 15.1002 10.75 14.9102 10.75 14.4302Z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16.0298 14.4302V9.3702C16.0298 8.8902 15.8298 8.7002 15.3198 8.7002H14.0298C13.5198 8.7002 13.3198 8.8902 13.3198 9.3702V14.4302C13.3198 14.9102 13.5198 15.1002 14.0298 15.1002" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <defs>
                    <clipPath id="clip0_4418_3131_small">
                      <rect width="24" height="24" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </div>
            )}
            
            {/* Эффект выбранной кнопки */}
            {isSelected && (
              <>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-xl sm:rounded-2xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-t from-transparent via-transparent to-white/10"></div>
              </>
            )}
            
            {/* Эффект ховера для невыбранных */}
            {!isSelected && !isDisabled && (
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-t from-purple-500/5 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
        )
      })}
      </div>
    </div>
  )
}

export default NumberGrid