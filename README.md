# 🗡️ Dungeon Discord Bot

![Discord.js](https://img.shields.io/badge/discord.js-v14-blue?style=for-the-badge&logo=discord)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=nodedotjs)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)
![License](https://img.shields.io/badge/Licencia-Todos_los_derechos_reservados-red?style=for-the-badge)

Un bot interactivo de **RPG, minería y colección de mascotas** para Discord. Desarrollado con **Node.js** y **Discord.js v14**, utilizando **SQLite** para la persistencia de datos y la librería **Canvas** para generar tarjetas dinámicas y animaciones GIF de eclosión en tiempo real.

---

## 📸 Vista Previa del Bot

| 🐾 Refugio de Mascotas (Canvas) | 🐣 Animación de Eclosión (GIF) |
| :---: | :---: |
| ![Refugio de Mascotas](https://raw.githubusercontent.com/placeholder/dungeon-bot/main/assets/preview-pet.png) | ![Animación Hatch GIF](https://raw.githubusercontent.com/placeholder/dungeon-bot/main/assets/preview-hatch.gif) |

---

## 🚀 Características Principales

* 🐾 **Sistema de Mascotas:** 
  * Cartas visuales personalizadas generadas en tiempo real mediante `@napi-rs/canvas`.
  * Eclosión animada en formato **GIF** con el módulo `gifenc`.
  * Menús desplegables (`StringSelectMenu`) y paginación para navegar por el refugio de mascotas.
  * Modificadores de estadísticas de combate (+ATK, +DEF, +HP).
* ⛏️ **Economía y Minería RPG:**
  * Recolección de oro, compra de minas e inversión en recursos.
* ⚔️ **Gestión de Estadísticas:**
  * Distribución de puntos de atributo e interfaz interactiva mediante botones.
* 🗄️ **Base de Datos Persistente:**
  * Integración con **SQLite** para un guardado rápido y local sin pérdida de progreso en los reinicios.
* 🛡️ **Seguridad y Estabilidad:**
  * Cooldowns globales e individuales para prevenir el spam de comandos/botones.
  * Manejo seguro de interacciones y mitigación del error `10062: Unknown interaction`.
  * Manejo de variables de entorno mediante `.env`.

---

## 📜 Lista de Comandos

| Comando | Alias | Descripción |
| :--- | :--- | :--- |
| `!mascota` | `!mascotas`, `!pet`, `!eclosionar` | Abre el refugio de mascotas, permite equipar criaturas o eclosionar huevos. |
| `!stats` | `!estadisticas` | Muestra tus estadísticas actuales de combate e interfaz de mejora. |
| `!rpg` | `!mina`, `!oro` | Panel principal de minería y recolección de oro. |

---

## 📁 Estructura del Proyecto

```text
Dungeon-Discord-Bot/
├── commands/            # Módulos de comandos del bot (!mascota, !stats, !rpg)
│   ├── mascota.js
│   ├── rpg.js
│   └── stats.js
├── data/                # Datos estáticos (Mascotas, Rangos, Probabilidades)
│   └── pets.js
├── utils/               # Utilidades, Canvas, Cooldowns y Base de Datos
│   ├── cooldown.js
│   ├── database.js
│   ├── game.js
│   └── petCanvas.js
├── .env.example         # Plantilla de variables de entorno
├── .gitignore           # Archivos ignorados por Git

├── bot.js               # Archivo ejecutable principal
├── package.json         # Dependencias y scripts
└── README.md            # Documentación del proyecto
```

⚙️ Instalación y Configuración Local
1. Requisitos Previos
Node.js v18.0.0 o superior

Git instalado en tu sistema

2. Clonar el Repositorio
Bash
git clone [https://github.com/TU_USUARIO/TU_REPOSITORIO.git](https://github.com/TU_USUARIO/TU_REPOSITORIO.git)
cd TU_REPOSITORIO
3. Instalar Dependencias
Bash
npm install
4. Configurar Variables de Entorno
Crea un archivo llamado .env en la raíz del proyecto (puedes tomar como referencia .env.example):

Fragmento de código
DISCORD_TOKEN=Tu_Token_De_Bot_Aqui
⚠️ IMPORTANTE: Nunca subas el archivo .env a GitHub ni compartas tu Token públicamente.

5. Iniciar el Bot
Bash
# Modo normal
node bot.js

# O ejecutando mediante PM2 para producción
pm2 start bot.js --name "dungeon-bot"
🛠️ Tecnologías Utilizadas
Discord.js v14 - Librería principal para interactuar con la API de Discord.

Better-SQLite3 - Motor de base de datos rápido y síncrono.

@napi-rs/canvas - Renderizado gráfico de tarjetas.

gifenc - Codificación de animaciones GIF en Node.js.

dotenv - Manejo de variables de entorno.

## 📄 Licencia

Este proyecto **no cuenta con una licencia de código abierto** (*All Rights Reserved*). Todos los derechos están reservados por el autor. No se autoriza la copia, redistribución ni modificación del código sin el permiso explícito del creador.
