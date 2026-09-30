// bot.js
require('dotenv').config(); // 🔑 Carga las variables de entorno del archivo .env
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { checkUserCooldown } = require('./utils/cooldown');

// 🗄️ Cargar e inicializar SQLite desde el arranque
const db = require('./utils/database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// 🔒 Token extraído de manera segura desde las variables de entorno (.env)
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!TOKEN) {
  console.error('❌ Error: No se ha configurado la variable DISCORD_TOKEN en el archivo .env');
  process.exit(1);
}

// ==========================================
// CARGADOR AUTOMÁTICO DE COMANDOS
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.name, command);
  console.log(`📦 Comando cargado: !${command.name}`);
}

// 🔄 Se utiliza 'clientReady' para corregir la advertencia DeprecationWarning
client.once('clientReady', () => {
  console.log(`✅ Bot RPG e historia SQLite conectados como ${client.user.tag}`);
});

// ==========================================
// CONTROLADOR DE MENSAJES (COMANDOS)
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Buscar el comando por su nombre principal o por un alias
  const command = client.commands.get(commandName) || 
                  client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  // 🛡️ Verificar Cooldown
  const timeLeft = checkUserCooldown(message.author.id);
  if (timeLeft) {
    const warningMsg = await message.reply(`⏳ **¡Tranquilo!** Espera **${timeLeft}s** antes de enviar otro comando.`);
    setTimeout(() => warningMsg.delete().catch(() => {}), 2500);
    return;
  }

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Error al ejecutar !${commandName}:`, error);
    await message.reply('❌ Ocurrió un error al ejecutar este comando.').catch(() => {});
  }
});

// ==========================================
// CONTROLADOR DE INTERACCIONES (BOTONES)
// ==========================================
const activeProcessing = new Set();

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // 1. Cancelar si Discord ya marcó la interacción como respondida
  if (interaction.replied || interaction.deferred) return;

  // 2. Prevenir peticiones simultáneas del mismo usuario
  if (activeProcessing.has(interaction.user.id)) return;

  // 🛡️ Verificar Cooldown
  const timeLeft = checkUserCooldown(interaction.user.id);
  if (timeLeft) {
    activeProcessing.add(interaction.user.id);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `⏳ **¡Tranquilo!** Espera **${timeLeft}s** antes de presionar otro botón.`,
          flags: 64 // Ephemeral flag
        });

        setTimeout(() => interaction.deleteReply().catch(() => {}), 2500);
      }
    } catch (err) {
      // Ignorar errores si la interacción expiró
    } finally {
      activeProcessing.delete(interaction.user.id);
    }
    return;
  }

  // Marcar como procesando
  activeProcessing.add(interaction.user.id);

  try {
    // Redirigir según el botón presionado
    if (['collect_gold', 'buy_mine'].includes(interaction.customId)) {
      const rpgCommand = client.commands.get('rpg');
      if (rpgCommand && rpgCommand.handleButton) {
        await rpgCommand.handleButton(interaction);
      }
    } else if (['add_atk', 'add_def', 'add_hp'].includes(interaction.customId)) {
      const statsCommand = client.commands.get('stats');
      if (statsCommand && statsCommand.handleButton) {
        await statsCommand.handleButton(interaction);
      }
    }
  } catch (error) {
    console.error('Error al procesar botón:', error);
  } finally {
    // Liberar estado al terminar
    activeProcessing.delete(interaction.user.id);
  }
});

// ==========================================
// MANEJO DE ERRORES Y APAGADO SEGURO
// ==========================================
process.on("unhandledRejection", (error) => {
    console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
    console.error("💀 Uncaught Exception:", error);
});

// Cerrar conexión de SQLite limpiamente si el proceso finaliza o se reinicia
const handleShutdown = (signal) => {
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando base de datos SQLite y desconectando bot...`);
  db.close();
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

client.login(TOKEN);