import React from 'react'
import { useLotteryStore } from '../lib/lotteryStore'
import { useBlockedNumbers } from '../hooks/use-supabase'
import { useLotterySetting } from '@/hooks/use-supabase'

interface NumberGridProps {
  selectedNumbers: number[]
  onNumberSelect: (number: number) => void
  allowMultiple?: boolean
}

const NumberGrid = ({ selectedNumbers, onNumberSelect }: NumberGridProps) => {
  const { data: blockedNumbers, isLoading, error } = useBlockedNumbers();
  const { updateSelectedNumbers } = useLotteryStore();
  
  // Получаем количество номеров из настроек с fallback
  const { data: maxNumbersSetting, error: settingsError } = useLotterySetting('max_numbers');
  
  // Используем fallback если настройки недоступны
  const maxNumbers = maxNumbersSetting && !settingsError ? 
    parseInt(maxNumbersSetting.setting_value) : 100; // fallback к 100
  
  const numbers = Array.from({ length: maxNumbers }, (_, i) => i + 1)

  const handleNumberClick = (number: number) => {
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
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 p-6">
        {numbers.map((number) => {
        const isSelected = selectedNumbers.includes(number)
        const isBlocked = blockedNumbersSet.has(number)
        
        return (
          <button
            key={number}
            onClick={() => !isBlocked && handleNumberClick(number)}
            disabled={isBlocked}
            className={`
              group relative h-14 w-14 rounded-2xl font-bold text-base transition-all duration-300 ease-out transform
              ${isSelected 
                ? `
                  bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 
                  text-white shadow-xl shadow-purple-500/40 
                  scale-110 rotate-1 
                  border-2 border-purple-400/50
                  hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-[1.15]
                  before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity
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
              
              ${!isBlocked && !isSelected ? 'hover:rotate-1' : ''}
            `}
          >
            <span className={`
              relative z-10 font-extrabold tracking-tight
              ${isSelected ? 'drop-shadow-sm' : ''}
            `}>
              {number}
            </span>
            
            {/* Блокированная линия */}
            {isBlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent rotate-45 shadow-sm"></div>
                <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent -rotate-45 shadow-sm absolute"></div>
              </div>
            )}
            
            {/* Эффект выбранной кнопки */}
            {isSelected && (
              <>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-2xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-transparent to-white/10"></div>
              </>
            )}
            
            {/* Эффект ховера для невыбранных */}
            {!isSelected && !isBlocked && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-purple-500/5 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
        )
      })}
      </div>
    </div>
  )
}

export default NumberGrid