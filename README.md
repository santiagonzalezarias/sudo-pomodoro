# 🍅 Sudo Pomodoro | Deep Work Terminal

> **Un temporizador Pomodoro con estética retro-futurista para desarrolladores que aman las terminales.**

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

DEMO: [https://pomodoro.santiarias.com/](https://pomodoro.santiarias.com/)

## 📖 ¿Qué es Sudo Pomodoro?

**Sudo Pomodoro** es un temporizador de técnica Pomodoro minimalista diseñado para programadores y personas que trabajan en entornos de desarrollo. La interfaz simula una terminal hacker con efectos de escaneo CRT, colores neón y una experiencia completamente inmersiva.

### ✨ Características principales

- 🎯 **Gestión de tareas integrada**: Añade y rastrea tus objetivos directamente desde la terminal
- 👤 **Sistema de identidad persistente**: Tu nombre y progreso se guardan automáticamente
- 🏆 **Sistema de niveles y XP**: Sube de nivel (GUEST → SUDO → ROOT) mientras trabajas
- 📊 **Estadísticas en tiempo real**: Visualiza tu tiempo total de trabajo y ciclos completados
- 🔊 **Audio ambiental**: Sonidos opcionales de datacenter, lluvia o teclado mecánico
- 🔔 **Notificaciones del navegador**: Alertas cuando termina cada ciclo
- 💻 **Control por comandos**: Maneja todo desde la terminal con comandos slash (/)
- 🌐 **100% local**: Toda tu información se guarda en tu navegador (localStorage)
- 🎨 **Interfaz retro-futurista**: Efectos de escaneo CRT y vibraciones neón

---

## 🚀 Cómo usar Sudo Pomodoro

### Primer uso

1. **Identifícate**: Al abrir la app por primera vez, ingresa tu nombre en la terminal
2. **Añade tareas**: Escribe cualquier objetivo y presiona `ENTER` para agregarlo a la lista
3. **Inicia el temporizador**: Presiona el botón `[ EXECUTE ]` o escribe `/start`
4. **Trabaja**: Concéntrate durante el ciclo de trabajo (25 min por defecto)
5. **Descansa**: Toma tu descanso corto (5 min) o largo (15 min)

### Comandos disponibles

Escribe estos comandos en la terminal (empiezan con `/`):

| Comando | Descripción |
|---------|-------------|
| `/help` | Abre el manual de instrucciones |
| `/add <tarea>` | Añade una nueva tarea explícitamente |
| `/name <nombre>` | Cambia tu nombre de usuario |
| `/clear` | Limpia todos los logs de la terminal |
| `/start` | Inicia el temporizador |
| `/pause` | Pausa el temporizador |
| `/stop` | Aborta/Resetea el temporizador actual |

### Panel de tareas

- **Click en checkbox**: Marca una tarea como completada
- **Hover + click en "x"**: Elimina una tarea
- **Objetivo actual**: La última tarea sin completar se muestra como tu objetivo activo

### Configuración

Presiona el botón `[ CONFIG ]` para personalizar:

- ⏱️ Duración de ciclos de trabajo
- ☕ Duración de descansos cortos y largos
- 🔁 Número de ciclos antes del descanso largo
- 🎵 Sonido ambiental (Datacenter, Lluvia, Teclado)
- 🔊 Volumen del audio
- 👤 Editar tu nombre de usuario

---

## 👨‍💻 Para Desarrolladores

### Requisitos previos

- **Node.js** 18.x o superior
- **npm** o **yarn**
- Un navegador moderno (Chrome, Firefox, Edge)

### Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/tu-usuario/sudo-pomodoro.git
cd sudo-pomodoro

# 2. Instala las dependencias
npm install
# o con yarn
yarn install

# 3. Ejecuta el servidor de desarrollo
npm run dev
# o con yarn
yarn dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

### Scripts disponibles

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor de producción
npm start

# Verificar linting
npm run lint
```

### Stack tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4
- **Almacenamiento**: localStorage (navegador)
- **Audio**: Web Audio API + HTML5 Audio
- **Notificaciones**: Notification API

### Estructura del proyecto

```
sudo-pomodoro/
├── app/                      # App Router de Next.js
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx             # Página principal
│   └── globals.css          # Estilos globales
├── components/              # Componentes React
│   └── DeepWorkTerminal.tsx # Componente principal del temporizador
├── data/                    # Datos estáticos
│   └── quotes.json          # Frases motivacionales
├── public/                  # Archivos públicos
│   └── sounds/              # Archivos de audio (placeholders)
└── README.md               # Este archivo
```

### Personalización

#### Cambiar tiempos predeterminados

Edita las constantes en `components/DeepWorkTerminal.tsx`:

```typescript
const DEFAULT_SETTINGS: Settings = {
    workTime: 25,              // Minutos de trabajo
    shortBreakTime: 5,         // Descanso corto
    longBreakTime: 15,         // Descanso largo
    cyclesBeforeLongBreak: 4,  // Ciclos antes del descanso largo
};
```

#### Añadir nuevas frases

Agrega citas a `data/quotes.json`:

```json
[
    "Tu nueva frase inspiradora aquí",
    "..."
]
```

#### Cambiar umbrales de nivel

Modifica los valores en `components/DeepWorkTerminal.tsx`:

```typescript
const LEVEL_THRESHOLDS = {
    GUEST: 0,   // Nivel inicial
    SUDO: 5,    // Después de 5 pomodoros
    ROOT: 15,   // Después de 15 pomodoros
};
```

### Contribuir

1. Haz un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 🙏 Agradecimientos

- Inspirado en la metodología Pomodoro de Francesco Cirillo
- Diseño retro-futurista inspirado en terminales Unix y cultura hacker
- Citasa estoicas y de programación de diversas fuentes

---

## 📧 Contacto

¿Preguntas? ¿Sugerencias? Abre un issue en el repositorio.

**¡Happy hacking! 🚀**

---
Creado con ❤️ por [Santi Arias](https://santiarias.com)
