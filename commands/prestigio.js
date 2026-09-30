const { EmbedBuilder } = require('discord.js');
const { getUserProfile } = require('../utils/game');

module.exports = {
  name: 'prestigio',
  aliases: ['renacer', 'ascender'],

  async execute(message) {
    const profile = getUserProfile(message.author.id);
    const REQUIRED_LEVEL = 50;

    if (profile.level < REQUIRED_LEVEL) {
      return message.reply(`❌ Debes alcanzar el **Nivel ${REQUIRED_LEVEL}** para poder Renacer. Tu nivel actual es **${profile.level}**.`);
    }

    // Reiniciar estadísticas conservando el Prestigio
    profile.prestige += 1;
    profile.level = 1;
    profile.exp = 0n;
    profile.gold = 0n;
    profile.generators.mines = 1n;
    profile.statPoints = 0;
    
    // Stats base iniciales
    profile.stats = {
      atk: 10n,
      def: 5n,
      maxHp: 100n
    };

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🌟 ¡HAS ASCENDIDO DE PRESTIGIO!')
      .setDescription(
        `Has renacido exitosamente. Tu nivel y recursos se han reiniciado, pero ahora posees poder ancestral.\n\n` +
        `🔮 **Nuevo Nivel de Prestigio:** \`${profile.prestige}\`\n` +
        `⚡ **Bonificación Permanente:** \`+${profile.prestige * 50}%\` producción de Oro pasivo.\n` +
        `🔓 **Mazmorras de Alto Nivel Desbloqueadas.**`
      )
      .setFooter({ text: 'Usa !stats y !rpg para comenzar de nuevo con tu multiplicador.' });

    await message.reply({ embeds: [embed] });
  }
};