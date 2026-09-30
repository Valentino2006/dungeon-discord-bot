# 🗡️ Dungeon Discord Bot

![Discord.js](https://img.shields.io/badge/discord.js-v14-blue?style=for-the-badge&logo=discord)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=nodedotjs)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)
![Licencia](https://img.shields.io/badge/Licencia-Todos_los_derechos_reservados-red?style=for-the-badge)

Bot interactivo de **RPG, minería y colección de mascotas** para Discord. Desarrollado con **Node.js** y **Discord.js v14**, utilizando **SQLite** para la persistencia de datos y **Canvas** para generar tarjetas dinámicas y animaciones GIF de eclosión en tiempo real.

---

## 📸 Vista Previa del Bot

| 🐾 Refugio de Mascotas (Canvas) | 🐣 Animación de Eclosión (GIF) |
| :---: | :---: |
| ![Refugio de Mascotas](./assets/preview-pet.png) | ![Animación Hatch GIF](./assets/preview-hatch.gif) |


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
  * Cooldowns globales e individuales para prevenir el spam de comandos y botones.
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
├── .env                 # Variables de entorno (no incluido en git)
├── .gitignore           # Archivos ignorados por Git
├── bot.js               # Archivo ejecutable principal
├── package.json         # Dependencias y scripts
└── README.md            # Documentación del proyecto
```

---

## 🛠️ Tecnologías Utilizadas

* [Discord.js v14](https://discord.js.org/) - Librería principal para interactuar con la API de Discord.
* [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) - Motor de base de datos rápido y síncrono.
* [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) - Renderizado gráfico de tarjetas.
* [gifenc](https://github.com/mattdesl/gifenc) - Codificación de animaciones GIF en Node.js.
* [dotenv](https://github.com/motdotla/dotenv) - Manejo de variables de entorno.

---

## ⚙️️ Despliegue y Mantenimiento Propio

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar las credenciales privadas en el archivo `.env`:
   ```env
   DISCORD_TOKEN=Tu_Token_Privado
   ```
3. Iniciar o mantener el servicio en producción con PM2:
   ```bash
   pm2 start bot.js --name "dungeon-bot"
   ```

---

## 📄 Licencia

Este proyecto **no cuenta con una licencia de código abierto** (*All Rights Reserved / Todos los derechos reservados*). Queda prohibida la copia, modificación, distribución o uso de este código sin la autorización previa y explícita del creador.
