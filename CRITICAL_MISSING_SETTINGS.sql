-- ===================================
-- КРИТИЧЕСКИ ВАЖНЫЕ НАСТРОЙКИ НЕ СИНХРОНИЗИРОВАНЫ!
-- ===================================

-- Эти настройки есть в БД, но НЕ используются в React приложении:

-- 1. АВТОМАТИЧЕСКИЙ РОЗЫГРЫШ (отключен!)
-- setting_key: auto_draw_enabled
-- setting_value: false
-- description: Activar sorteo automático

-- 2. НАЗВАНИЕ КОМПАНИИ
-- setting_key: company_name  
-- setting_value: Reserva Tu Suerte
-- description: Nombre de la empresa

-- 3. РАЗМЕР ПРИЗА ПО УМОЛЧАНИЮ
-- setting_key: default_prize_amount
-- setting_value: 500.00  
-- description: Monto del premio por defecto en USD

-- 4. ДЛИТЕЛЬНОСТЬ РОЗЫГРЫША
-- setting_key: draw_duration_hours
-- setting_value: 24
-- description: Duración del sorteo en horas

-- 5. EMAIL ПОДДЕРЖКИ  
-- setting_key: support_email
-- setting_value: support@reservatusuerte.com
-- description: Email de soporte

-- ===================================
-- ПОСЛЕДСТВИЯ НЕ СИНХРОНИЗАЦИИ:
-- ===================================

-- ❌ Нет управления автоматическими розыгрышами
-- ❌ Хардкод названия компании в коде
-- ❌ Хардкод размера приза в коде  
-- ❌ Хардкод длительности розыгрыша
-- ❌ Хардкод email поддержки в коде

-- ===================================
-- ТРЕБУЕТСЯ:
-- ===================================

-- ✅ Создать useSettingsSupabase хук
-- ✅ Интегрировать настройки в компоненты
-- ✅ Создать админ панель для управления настройками
-- ✅ Убрать хардкод из кода приложения

-- ===================================
-- ПРИОРИТЕТ: КРИТИЧЕСКИЙ 🚨
-- =================================== 