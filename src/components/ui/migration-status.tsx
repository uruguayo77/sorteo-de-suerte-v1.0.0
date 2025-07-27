import React from 'react'
import { CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface MigrationStatusProps {
  showMigrationWarnings?: boolean
}

export function MigrationStatus({ showMigrationWarnings = true }: MigrationStatusProps) {
  const [dismissed, setDismissed] = React.useState(false)

  if (!showMigrationWarnings || dismissed) return null

  return (
    <div className="space-y-3 mb-6">
      {/* Sistema de Monedas */}
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