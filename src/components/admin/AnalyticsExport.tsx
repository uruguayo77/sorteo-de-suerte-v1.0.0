/**
 * AnalyticsExport.tsx - Компонент для экспорта аналитических данных в Excel и PDF
 * Позволяет администратору экспортировать отчеты с фильтрами по датам и типам активности
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AnalyticsService } from '@/lib/analyticsService'
import { toast } from '@/hooks/use-toast'
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar,
  Filter,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface ExportFilters {
  dateFrom: string
  dateTo: string
  actionTypes: string[]
  includeUserData: boolean
  includeMetadata: boolean
  format: 'excel' | 'pdf' | 'both'
}

export function AnalyticsExport() {
  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 дней назад
    dateTo: new Date().toISOString().split('T')[0], // сегодня
    actionTypes: [],
    includeUserData: true,
    includeMetadata: false,
    format: 'excel'
  })

  const [isExporting, setIsExporting] = useState(false)
  const [lastExport, setLastExport] = useState<{
    date: string
    format: string
    recordCount: number
  } | null>(null)

  const actionTypeOptions = [
    { value: 'page_visit', label: 'Visitas de Página' },
    { value: 'number_select', label: 'Selección de Números' },
    { value: 'payment_start', label: 'Inicio de Pago' },
    { value: 'payment_complete', label: 'Pago Completado' },
    { value: 'ticket_scratch', label: 'Raspar Billete' },
    { value: 'admin_login', label: 'Login Admin' },
    { value: 'reservation_create', label: 'Crear Reserva' },
    { value: 'reservation_cancel', label: 'Cancelar Reserva' }
  ]

  const handleActionTypeToggle = (actionType: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      actionTypes: checked 
        ? [...prev.actionTypes, actionType]
        : prev.actionTypes.filter(type => type !== actionType)
    }))
  }

  const validateFilters = (): boolean => {
    if (!filters.dateFrom || !filters.dateTo) {
      toast({
        title: "Error de validación",
        description: "Por favor selecciona un rango de fechas válido",
        variant: "destructive"
      })
      return false
    }

    if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
      toast({
        title: "Error de fechas",
        description: "La fecha de inicio debe ser anterior a la fecha de fin",
        variant: "destructive"
      })
      return false
    }

    const daysDifference = (new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / (1000 * 60 * 60 * 24)
    if (daysDifference > 90) {
      toast({
        title: "Rango demasiado amplio",
        description: "Por favor selecciona un rango máximo de 90 días",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const exportToExcel = async (data: any[]): Promise<Blob> => {
    // Simulamos la generación de Excel (en producción usarías una librería como xlsx)
    const csvContent = generateCSV(data)
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  }

  const exportToPDF = async (data: any[]): Promise<Blob> => {
    // Simulamos la generación de PDF (en producción usarías una librería como jsPDF)
    const htmlContent = generateHTML(data)
    return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
  }

  const generateCSV = (data: any[]): string => {
    if (data.length === 0) return 'No hay datos para exportar'

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    )

    return [headers, ...rows].join('\n')
  }

  const generateHTML = (data: any[]): string => {
    const timestamp = new Date().toLocaleString('es')
    const dateRange = `${filters.dateFrom} - ${filters.dateTo}`
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Reporte de Analítica - Reserva Tu Suerte</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reporte de Analítica</h1>
    <h2>Reserva Tu Suerte</h2>
  </div>
  
  <div class="info">
    <p><strong>Período:</strong> ${dateRange}</p>
    <p><strong>Fecha de generación:</strong> ${timestamp}</p>
    <p><strong>Total de registros:</strong> ${data.length}</p>
    <p><strong>Tipos de actividad:</strong> ${filters.actionTypes.length > 0 ? filters.actionTypes.join(', ') : 'Todos'}</p>
  </div>

  <table>
    <thead>
      <tr>
        ${data.length > 0 ? Object.keys(data[0]).map(key => `<th>${key}</th>`).join('') : '<th>No hay datos</th>'}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          ${Object.values(row).map(value => `<td>${value || ''}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generado automáticamente por el sistema de analítica de Reserva Tu Suerte</p>
  </div>
</body>
</html>`
  }

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    if (!validateFilters()) return

    setIsExporting(true)

    try {
      console.log('📊 Iniciando exportación con filtros:', filters)

      // Obtenemos los datos de la API
      const data = await AnalyticsService.getActivityLogs({
        date_from: filters.dateFrom + 'T00:00:00.000Z',
        date_to: filters.dateTo + 'T23:59:59.999Z',
        action_type: filters.actionTypes.length > 0 ? undefined : undefined, // Si no hay filtros específicos, obtenemos todo
        limit: 10000 // Límite alto para exportación
      })

      // Filtrar por tipos de acción si se especificaron
      const filteredData = filters.actionTypes.length > 0 
        ? data.filter(item => filters.actionTypes.includes(item.action_type))
        : data

      if (filteredData.length === 0) {
        toast({
          title: "Sin datos",
          description: "No se encontraron datos para el rango de fechas seleccionado",
          variant: "destructive"
        })
        return
      }

      // Preparar datos para exportación
      const exportData = filteredData.map(item => ({
        'Fecha': new Date(item.created_at).toLocaleString('es'),
        'Sesión': item.session_id,
        'Tipo de Acción': item.action_type,
        'Página': item.page_visited,
        ...(filters.includeUserData && {
          'IP Usuario': item.user_ip || 'N/A',
          'User Agent': item.user_agent || 'N/A'
        }),
        ...(filters.includeMetadata && {
          'Metadatos': JSON.stringify(item.metadata || {})
        })
      }))

      const timestamp = new Date().toISOString().split('T')[0]
      
      // Exportar según el formato seleccionado
      if (filters.format === 'excel' || filters.format === 'both') {
        const excelBlob = await exportToExcel(exportData)
        downloadFile(excelBlob, `analytics_report_${timestamp}.csv`)
      }

      if (filters.format === 'pdf' || filters.format === 'both') {
        const pdfBlob = await exportToPDF(exportData)
        downloadFile(pdfBlob, `analytics_report_${timestamp}.html`)
      }

      // Guardar información del último export
      setLastExport({
        date: new Date().toLocaleString('es'),
        format: filters.format,
        recordCount: exportData.length
      })

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${exportData.length} registros en formato ${filters.format}`,
      })

    } catch (error) {
      console.error('❌ Error en exportación:', error)
      toast({
        title: "Error de exportación",
        description: "No se pudo completar la exportación. Inténtalo de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="bg-gray-800/50 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Download className="w-5 h-5" />
          Exportar Datos Analíticos
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Rango de fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateFrom" className="text-gray-300">Fecha de inicio</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-gray-300">Fecha de fin</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        <Separator className="bg-gray-600" />

        {/* Tipos de actividad */}
        <div>
          <Label className="text-gray-300 mb-3 block">Tipos de Actividad</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {actionTypeOptions.map(option => (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={filters.actionTypes.includes(option.value)}
                  onCheckedChange={(checked) => handleActionTypeToggle(option.value, checked as boolean)}
                  className="border-gray-500"
                />
                <span className="text-sm text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
          {filters.actionTypes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.actionTypes.map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                  {actionTypeOptions.find(opt => opt.value === type)?.label || type}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator className="bg-gray-600" />

        {/* Opciones de contenido */}
        <div className="space-y-3">
          <Label className="text-gray-300">Opciones de Contenido</Label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              checked={filters.includeUserData}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeUserData: checked as boolean }))}
              className="border-gray-500"
            />
            <span className="text-sm text-gray-300">Incluir datos del usuario (IP, User Agent)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              checked={filters.includeMetadata}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeMetadata: checked as boolean }))}
              className="border-gray-500"
            />
            <span className="text-sm text-gray-300">Incluir metadatos adicionales</span>
          </label>
        </div>

        <Separator className="bg-gray-600" />

        {/* Formato de exportación */}
        <div>
          <Label className="text-gray-300 mb-3 block">Formato de Exportación</Label>
          <Select value={filters.format} onValueChange={(value: 'excel' | 'pdf' | 'both') => setFilters(prev => ({ ...prev, format: value }))}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="excel">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel/CSV
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PDF/HTML
                </div>
              </SelectItem>
              <SelectItem value="both">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Ambos formatos
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Información del último export */}
        {lastExport && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-900/20 border border-green-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Última exportación exitosa</span>
            </div>
            <div className="text-xs text-green-300 mt-1">
              {lastExport.date} • {lastExport.recordCount} registros • Formato: {lastExport.format}
            </div>
          </motion.div>
        )}

        {/* Botón de exportación */}
        <Button 
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Exportar Datos
            </>
          )}
        </Button>

        {/* Notas importantes */}
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-200 space-y-1">
              <p><strong>Importante:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>El rango máximo de exportación es de 90 días</li>
                <li>Los archivos Excel se exportan como CSV para compatibilidad</li>
                <li>Los archivos PDF se exportan como HTML para visualización</li>
                <li>Los datos personales están sujetos a políticas de privacidad</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}