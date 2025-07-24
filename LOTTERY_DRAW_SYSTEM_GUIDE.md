# 🎲 Sistema de Sorteos - Guía Completa

## 📋 Descripción General

El Sistema de Sorteos permite a los administradores crear, gestionar y ejecutar sorteos de lotería con cuenta regresiva en tiempo real, detección automática de estados y anuncio de ganadores.

## 🚀 Instalación

### 1. Ejecutar SQL en Supabase

Ejecute todo el código del archivo `lottery_draw_system.sql` en el SQL Editor de su proyecto Supabase.

### 2. Verificar Creación de Tablas

Después de ejecutar el SQL, deberían aparecer:
- Tabla `lottery_draws` - Gestión de sorteos
- Tabla `lottery_settings` - Configuraciones del sistema

## 🎭 Estados del Sorteo

### Estados Disponibles

| Estado | Descripción | Frontend |
|--------|-------------|----------|
| `scheduled` | Programado para el futuro | Muestra cuenta regresiva |
| `active` | En curso (tiempo expirado) | "Esperando resultados..." |
| `finished` | Finalizado con ganador | Muestra ganador completo |
| `cancelled` | Cancelado | No se muestra |

## 📖 Flujo Completo del Sistema

### 1. Creación del Sorteo (Admin)
```typescript
// El administrador crea un nuevo sorteo
const sorteo = await createDraw({
  draw_name: "Sorteo de Navidad 2024",
  draw_date: "2024-12-25T20:00:00Z",
  prize_amount: 1000,
  created_by: adminId
})
```

### 2. Visualización Frontend
- **Cuenta Regresiva**: Se muestra automáticamente cuando hay un sorteo programado
- **Posición**: Top center, sobre todos los elementos (z-40)
- **Actualización**: Cada segundo, tiempo calculado localmente

### 3. Cambio Automático de Estado
```sql
-- Ejecutado automáticamente cada 10 segundos por useCurrentDraw
SELECT update_draw_status_to_active();
```

### 4. Periodo "Esperando Resultados"
- **Trigger**: Cuando `draw_date <= NOW()`
- **Estado**: Cambia a `active`
- **Frontend**: Muestra mensaje "Sorteo en Progreso - Esperando resultados..."

### 5. Selección del Ganador (Admin)
```typescript
// Administrador establece el ganador
await setWinner({
  drawId: "uuid-del-sorteo",
  winnerNumber: 42,
  adminId: adminId
})
```

### 6. Anuncio del Ganador
- **Estado**: Cambia a `finished`
- **Frontend**: Modal a pantalla completa con:
  - Número ganador
  - Nombre y cédula (de applications aprobadas)
  - Monto del premio
  - Animaciones celebratorias

## 💻 Componentes Frontend

### DrawStatus Component
```typescript
// Ubicación: src/components/DrawStatus.tsx
- Muestra estado actual del sorteo
- Cuenta regresiva en tiempo real
- Detección automática de cambios de estado
- Modales para diferentes estados
```

### DrawManagement Component (Admin)
```typescript
// Ubicación: src/components/admin/DrawManagement.tsx
- Crear nuevos sorteos
- Ver lista de todos los sorteos
- Establecer ganadores para sorteos activos
- Gestión completa desde admin panel
```

## 🔧 Configuraciones del Sistema

### Configuraciones Disponibles

| Clave | Valor Por Defecto | Descripción |
|-------|-------------------|-------------|
| `default_prize_amount` | `500.00` | Premio por defecto (USD) |
| `draw_duration_hours` | `24` | Duración estándar del sorteo |
| `auto_draw_enabled` | `false` | Sorteo automático activado |
| `company_name` | `Reserva Tu Suerte` | Nombre de la empresa |
| `support_email` | `support@reservatusuerte.com` | Email de soporte |

### Actualizar Configuraciones
```typescript
await updateLotterySetting({
  settingKey: 'default_prize_amount',
  settingValue: '750.00',
  adminId: adminUser.id
})
```

## 🎨 Interfaces de Usuario

### 1. Cuenta Regresiva (Estado: scheduled)
```jsx
<div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40">
  <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl">
    <Clock /> Próximo Sorteo
    <div className="text-2xl font-mono">{timeRemaining}</div>
    <div>Premio: ${prize_amount} USD</div>
  </div>
</div>
```

### 2. Esperando Resultados (Estado: active)
```jsx
<div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40">
  <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl">
    <Timer className="animate-spin" /> Sorteo en Progreso
    <p>Esperando resultados...</p>
  </div>
</div>
```

### 3. Anuncio de Ganador (Estado: finished)
```jsx
<div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50">
  <div className="bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-500/20">
    <Trophy className="animate-spin" />
    <h2>¡Tenemos Ganador!</h2>
    <div className="text-6xl">#{winner_number}</div>
    <p>{winner_name}</p>
    <p>Cédula: {winner_cedula}</p>
    <p>Premio: ${prize_amount} USD</p>
  </div>
</div>
```

## 🛠️ Hooks Disponibles

### useCurrentDraw
```typescript
const { data: currentDraw } = useCurrentDraw()
// Retorna: LotteryDraw | null
// Actualización: Cada 10 segundos
```

### useAllDraws (Admin)
```typescript
const { data: draws } = useAllDraws()
// Retorna: LotteryDraw[]
// Actualización: Cada 30 segundos
```

### useCreateDraw (Admin)
```typescript
const createDraw = useCreateDraw()
await createDraw.mutateAsync(drawData)
```

### useSetWinner (Admin)
```typescript
const setWinner = useSetWinner()
await setWinner.mutateAsync({ drawId, winnerNumber, adminId })
```

## 📱 Integración con Aplicaciones

### Detección Automática del Ganador
```sql
-- La función automáticamente busca en applications aprobadas
SELECT a.user_name, a.cedula
FROM applications a
WHERE winner_number = ANY(a.numbers)
  AND a.status = 'approved'
ORDER BY a.created_at ASC
LIMIT 1;
```

### Bloqueo de Números
- Los números permanecen bloqueados durante sorteos activos
- Se mantienen bloqueados para ganadores
- Se liberan si se rechaza una aplicación

## 🔒 Seguridad

### Permisos de Administrador
- Solo administradores pueden crear sorteos
- Solo administradores pueden establecer ganadores
- Verificación de roles en todas las operaciones

### Row Level Security (RLS)
- Acceso público solo a sorteos activos/finalizados
- Modificaciones restringidas a service_role
- Configuraciones públicas limitadas

## ⚙️ Funciones SQL Principales

### Gestión de Sorteos
```sql
-- Crear sorteo
SELECT create_lottery_draw('Sorteo 2024', '2024-12-25 20:00:00+00', 500.00, admin_id);

-- Obtener sorteo actual
SELECT * FROM get_current_draw();

-- Establecer ganador
SELECT set_draw_winner(draw_id, 42, admin_id);

-- Actualizar estados automáticamente
SELECT update_draw_status_to_active();
```

### Configuraciones
```sql
-- Actualizar configuración
SELECT update_lottery_setting('default_prize_amount', '750.00', admin_id);

-- Obtener configuración
SELECT get_lottery_setting('default_prize_amount');

-- Ver todas las configuraciones
SELECT * FROM get_lottery_settings();
```

## 🎯 Ejemplos de Uso

### Caso 1: Sorteo de Fin de Año
```typescript
// 1. Admin crea sorteo para Año Nuevo
await createDraw({
  draw_name: "Gran Sorteo de Año Nuevo 2025",
  draw_date: "2024-12-31T23:59:00Z",
  prize_amount: 2000,
  created_by: adminId
})

// 2. Frontend muestra cuenta regresiva automáticamente
// 3. Al llegar la fecha: estado cambia a 'active'
// 4. Admin selecciona ganador #73
// 5. Sistema busca usuario con número 73 aprobado
// 6. Frontend muestra modal de ganador con datos completos
```

### Caso 2: Sorteo Semanal Recurrente
```typescript
// Configurar sorteos cada viernes a las 8 PM
const nextFriday = getNextFriday()
await createDraw({
  draw_name: "Sorteo Semanal",
  draw_date: nextFriday.toISOString(),
  prize_amount: 500,
  created_by: adminId
})
```

## 🔧 Mantenimiento

### Tareas Regulares
1. **Limpieza de sorteos antiguos**: Archivar sorteos finalizados
2. **Monitoreo de estados**: Verificar transiciones automáticas
3. **Respaldo de ganadores**: Guardar historiales de premios
4. **Actualización de configuraciones**: Ajustar premios según temporada

### Métricas Importantes
- Tiempo promedio entre creación y finalización
- Número de participantes por sorteo
- Distribución de números ganadores
- Tasa de reclamación de premios

## ⚠️ Consideraciones Importantes

### Zona Horaria
- Todos los timestamps se almacenan en UTC
- Frontend maneja conversión automática a zona local
- Configurar correctamente zona horaria del servidor

### Rendimiento
- Índices optimizados para consultas frecuentes
- Paginación recomendada para listas largas de sorteos
- Cache de configuraciones en frontend

### Escalabilidad
- Sistema preparado para múltiples sorteos simultáneos
- Soporte para diferentes tipos de premios
- Extensible para sorteos automáticos programados

---

**Estado**: ✅ Listo para producción  
**Versión**: 1.0.0  
**Idioma**: Español (como solicitado)  
**Última actualización**: 2024 