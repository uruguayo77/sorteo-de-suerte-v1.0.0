# 🎲 Sorteo de Suerte - Radius Lottery v.1.0.0

Una aplicación web moderna para sorteos de números con sistema de reservas y pagos integrados. Desarrollado por Radius.

## ✨ Características

- 🎯 **Selección de números**: Interfaz intuitiva para seleccionar hasta 3 números del 1 al 100
- ⏰ **Countdown en tiempo real**: Temporizador para el próximo sorteo (8:00 PM diario)
- 💳 **Sistema de pagos**: Soporte para Pago Móvil, Binance y Bybit
- 📱 **Diseño responsivo**: Optimizado para móviles, tablets y desktop
- 🎨 **UI moderna**: Diseño elegante con gradientes y animaciones
- 📊 **Gestión de reservas**: Sistema completo de reservas con Supabase
- 🏆 **Notificaciones de ganadores**: Alertas automáticas para números ganadores

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Animaciones**: Framer Motion
- **Backend**: Supabase (PostgreSQL)
- **Fuentes**: Google Fonts (Changa)

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/username/sorteo-de-suerte-v1.0.0.git
   cd sorteo-de-suerte-v1.0.0
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Supabase**
   - Crear proyecto en [Supabase](https://supabase.com)
   - Ejecutar el script SQL desde `supabase_setup.sql`
   - Configurar variables de entorno:
   ```bash
   cp .env.example .env.local
   # Editar .env.local con tus credenciales de Supabase
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

## 📋 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build
- `npm run lint` - Linter de código

## 🗄️ Base de Datos

El proyecto utiliza Supabase con las siguientes tablas:

- **number_reservations**: Gestión de reservas de números
- **winners**: Registro de ganadores

## 🎮 Cómo Usar

1. **Seleccionar números**: Haz clic en los números que deseas reservar (máximo 3)
2. **Método de pago**: Elige entre Pago Móvil, Binance o Bybit
3. **Completar datos**: Ingresa tu información personal y comprobante
4. **Confirmar reserva**: Tu número queda reservado para el próximo sorteo

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI reutilizables
│   ├── NumberGrid.tsx  # Grilla de números
│   ├── PaymentForm.tsx # Formulario de pago
│   └── ...
├── hooks/              # Custom hooks
├── lib/                # Utilidades y configuraciones
├── pages/              # Páginas principales
└── styles/             # Estilos globales
```

## 🚀 Deploy

El proyecto está configurado para desplegarse fácilmente en plataformas como:

- **Vercel** (recomendado)
- **Netlify**
- **GitHub Pages**

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **Radius Team** - *Desarrollo inicial* - Sistema de lotería digital moderno

## 🙏 Agradecimientos

- shadcn/ui por los componentes de UI
- Framer Motion por las animaciones
- Supabase por el backend
- Tailwind CSS por el sistema de estilos

---

⭐ ¡Dale una estrella al proyecto si te gustó!
