import { supabase } from './supabase'

export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Тестирование подключения к Supabase...')
    
    // Проверяем подключение, пытаясь получить данные из таблицы
    const { data, error } = await supabase
      .from('number_reservations')
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Подключение к Supabase успешно!')
        console.log('⚠️  Таблица number_reservations не найдена - выполните SQL скрипт supabase_setup.sql')
        return { success: true, message: 'Подключение работает, но таблицы не созданы' }
      } else {
        console.error('❌ Ошибка подключения к Supabase:', error.message)
        return { success: false, message: error.message }
      }
    }
    
    console.log('✅ Подключение к Supabase успешно!')
    console.log('✅ Таблицы найдены')
    return { success: true, message: 'Подключение работает' }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
    return { success: false, message: 'Критическая ошибка подключения' }
  }
} 