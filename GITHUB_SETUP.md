# 🚀 Настройка GitHub репозитория

## Шаги для создания репозитория на GitHub

### 1. Создать новый репозиторий на GitHub.com

1. Перейди на [GitHub.com](https://github.com)
2. Нажми на кнопку **"New"** или **"+"** в правом верхнем углу
3. Выбери **"New repository"**

### 2. Настройки репозитория

- **Repository name**: `sorteo-de-suerte-v1.0.0`
- **Description**: `🎲 Aplicación web moderna para sorteos de números con sistema de reservas y pagos integrados`
- **Visibility**: Public (или Private по желанию)
- **НЕ** инициализируй с README, .gitignore или license (уже есть в проекте)

### 3. Добавить remote origin

После создания репозитория, выполни следующие команды в терминале:

```bash
# Добавить remote origin (замени USERNAME на свой GitHub username)
git remote add origin https://github.com/USERNAME/sorteo-de-suerte-v1.0.0.git

# Установить upstream branch и push
git branch -M main
git push -u origin main
```

### 4. Настроить название ветки (опционально)

Если хочешь использовать `main` вместо `master`:

```bash
git branch -M main
```

### 5. Push в репозиторий

```bash
git push -u origin main
```

## 🏷️ Создание релиза v.1.0.0

1. Перейди в свой репозиторий на GitHub
2. Нажми на **"Releases"** 
3. Нажми **"Create a new release"**
4. **Tag version**: `v1.0.0`
5. **Release title**: `🎉 Sorteo de Suerte v.1.0.0 - Initial Release`
6. **Description**:
   ```
   ## 🎲 Primera versión de Sorteo de Suerte
   
   ### ✨ Características principales:
   - 🎯 Selección intuitiva de números (1-100)
   - ⏰ Countdown en tiempo real para sorteos
   - 💳 Sistema de pagos integrado (Pago Móvil, Binance, Bybit)
   - 📱 Diseño responsivo y moderno
   - 🏆 Gestión completa de reservas con Supabase
   
   ### 🛠️ Stack tecnológico:
   - React 18 + TypeScript + Vite
   - Tailwind CSS + shadcn/ui
   - Framer Motion para animaciones
   - Supabase como backend
   - Google Fonts (Changa)
   ```

## 📋 Estado actual del проекта

✅ **Completado:**
- Git repositorio inicializado
- Primer commit realizado 
- README.md creado
- .gitignore configurado
- Proyecto listo para push

🔄 **Pendiente:**
- Crear repositorio en GitHub
- Hacer push del código
- Crear release v.1.0.0

## 🎯 Próximos pasos

1. Crear el repositorio en GitHub con el nombre `sorteo-de-suerte-v1.0.0`
2. Ejecutar comandos para conectar con GitHub
3. Hacer push del código
4. Crear el primer release

¡El proyecto está listo para ser subido a GitHub! 🚀 