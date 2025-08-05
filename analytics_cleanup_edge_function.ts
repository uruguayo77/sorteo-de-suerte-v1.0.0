/**
 * Edge Function для автоматической очистки логов аналитики старше 90 дней
 * Запускается по расписанию через Supabase Cron Jobs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Получаем Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🧹 Запуск автоматической очистки логов аналитики...')

    // Вызываем функцию очистки из базы данных
    const { data: deletedCount, error } = await supabase
      .rpc('cleanup_old_activity_logs')

    if (error) {
      console.error('❌ Ошибка очистки логов:', error)
      throw error
    }

    const result = {
      success: true,
      deleted_count: deletedCount || 0,
      timestamp: new Date().toISOString(),
      message: `Успешно удалено ${deletedCount || 0} старых логов`
    }

    console.log('✅ Очистка логов завершена:', result)

    // Логируем результат очистки
    await supabase
      .from('user_activity_log')
      .insert({
        session_id: 'system_cleanup',
        action_type: 'admin_login',
        page_visited: '/system/cleanup',
        metadata: {
          cleanup_result: result,
          function_name: 'analytics_cleanup_edge_function'
        }
      })

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Критическая ошибка в Edge Function:', error)

    const errorResult = {
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(errorResult),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    )
  }
})

/* 
===========================================
НАСТРОЙКА CRON JOB В SUPABASE:
===========================================

1. В Supabase Dashboard перейти в Database → Extensions
2. Включить расширение "pg_cron"
3. Выполнить SQL команду:

SELECT cron.schedule(
  'analytics-cleanup',
  '0 2 * * *', -- Каждый день в 2:00 ночи
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/analytics-cleanup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

Где:
- YOUR_PROJECT_REF - замените на реальный ref вашего проекта
- YOUR_ANON_KEY - замените на anon key из настроек проекта

===========================================
АЛЬТЕРНАТИВНАЯ НАСТРОЙКА (если pg_cron недоступен):
===========================================

Можно настроить внешний CRON через GitHub Actions или другой сервис:

```yaml
name: Cleanup Analytics Logs
on:
  schedule:
    - cron: '0 2 * * *'  # Каждый день в 2:00 UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            "https://YOUR_PROJECT_REF.supabase.co/functions/v1/analytics-cleanup"
```

===========================================
РУЧНОЙ ВЫЗОВ ДЛЯ ТЕСТИРОВАНИЯ:
===========================================

curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/analytics-cleanup"

===========================================
*/