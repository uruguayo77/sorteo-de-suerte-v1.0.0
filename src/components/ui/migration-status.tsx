import React from 'react'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface MigrationStatusProps {
  showMigrationWarnings?: boolean
}

export function MigrationStatus({ showMigrationWarnings = true }: MigrationStatusProps) {
  const [dismissed, setDismissed] = React.useState(false)

  if (!showMigrationWarnings || dismissed) return null

  return (
    <div className="space-y-3 mb-6">
             {/* Problema con columna scheduled_start_time */}
       <Alert className="border-red-500/30 bg-red-500/10">
         <AlertTriangle className="h-4 w-4 text-red-400" />
         <AlertTitle className="text-red-300">
           Error de Columna en Base de Datos
         </AlertTitle>
                                                           <AlertDescription className="text-red-200">
                           ❌ <strong>CRÍTICO:</strong> Error 401 Unauthorized - Falta archivo .env.local
              <br />
              ❌ Error 42501: Política RLS bloquea creación en 'lottery_draws'
              <br />
              ❌ Error 22P02: Sintaxis UUID inválida para campo 'created_by'  
              <br />
              ❌ Error PGRST204: Columna 'scheduled_start_time' no encontrada
              <br />
                             ⚠️ <strong>Error 54001:</strong> Stack Overflow en triggeres - <code className="bg-red-600/30 px-1 rounded">fix_stack_overflow_trigger.sql</code>
               <br />
               ⚠️ <strong>Error 42710:</strong> Policy already exists - <code className="bg-red-600/30 px-1 rounded">fix_policy_42710_error.sql</code>
               <br />
               <br />
               🚨 <strong>SOLUCIÓN URGENTE:</strong>
               <br />
               1️⃣ <strong>Crear archivo .env.local</strong> con claves Supabase (ver documentación)
               <br />
               2️⃣ <strong>Ejecutar SQL:</strong> <code className="bg-red-600/30 px-1 rounded font-bold">fix_unauthorized_and_rls_complete.sql</code>
               <br />
               3️⃣ <strong>Si error Stack Overflow:</strong> <code className="bg-red-600/30 px-1 rounded font-bold">fix_stack_overflow_trigger.sql</code>
               <br />
               4️⃣ <strong>Si error Policy already exists:</strong> <code className="bg-red-600/30 px-1 rounded font-bold">fix_policy_42710_error.sql</code>
               <br />
               5️⃣ <strong>Reiniciar aplicación:</strong> <code className="bg-black/30 px-1 rounded">npm run dev</code>
              <br />
              <br />
              ⏱️ <strong>Función programación (opcional):</strong> <code className="bg-black/30 px-1 rounded">add_scheduled_start_time.sql</code>
              <br />
              <span className="text-xs text-red-300 mt-1 block">
                 🚨 Sin .env.local y SQL fix - aplicación NO funcionará
              </span>
           </AlertDescription>
       </Alert>

      {/* Валютная система */}
      <Alert className="border-green-500/30 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-400" />
        <AlertTitle className="text-green-300">
          Sistema de Monedas Activo
        </AlertTitle>
        <AlertDescription className="text-green-200">
          ✅ Precios en Bolívares (Bs) y Dólares ($) configurados
          <br />
          ✅ Conversión automática con tasa de ve.dolarapi.com
        </AlertDescription>
      </Alert>

      {/* Información sobre función de inicio programado */}
      <Alert className="border-blue-500/30 bg-blue-500/10">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertTitle className="text-blue-300 flex items-center gap-2">
          Función de Inicio Programado
          <Badge variant="outline" className="border-blue-500 text-blue-300">
            Opcional
          </Badge>
        </AlertTitle>
        <AlertDescription className="text-blue-200">
          ℹ️ Las funciones de inicio automático están deshabilitadas por defecto
          <br />
          Para habilitar sorteos con temporizador automático, ejecute: <code className="bg-black/30 px-1 rounded">add_scheduled_start_time.sql</code>
          <br />
          <span className="text-xs text-blue-300 mt-1 block">
            ✅ Los sorteos manuales y el sistema de precios funcionan perfectamente sin esta función
          </span>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button
          onClick={() => setDismissed(true)}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          Ocultar notificaciones
        </Button>
      </div>
    </div>
  )
} 