const { EmbedBuilder } = require('discord.js');
const { 
  getUserProfile, 
  getPendingPassiveIncome, 
  formatNumber, 
  BASE_PRODUCTION_PER_MINE 
} = require('../utils/game');
const EMOJIS = require('../data/emojis');

module.exports = {
  name: 'oro',
  aliases: ['bal', 'saldo'],
  
  async execute(message) {
    const profile = getUserProfile(message.author.id);
    
    // Calcula el oro pasivo pendiente en la bóveda
    const { pendingGold } = getPendingPassiveIncome(profile);

    // Calcula la producción por segundo considerando el multiplicador de prestigio
    const prestigeBonus = 1 + (profile.prestige * 0.5);
    const goldPerSecond = BigInt(Math.floor(Number(profile.generators.mines * BASE_PRODUCTION_PER_MINE) * prestigeBonus));

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💰 Bóveda y Saldo de ${message.author.username}`)
      .addFields(
        { name: `${EMOJIS.moneda ?? '🪙'} Oro en Bolsillo`, value: `\`${formatNumber(profile.gold)}\``, inline: true },
        { name: '📦 Oro Pendiente en Minas', value: `\`${formatNumber(pendingGold)}\``, inline: true },
        { name: '⚡ Generación Pasiva', value: `\`${formatNumber(goldPerSecond)} / seg\``, inline: true },
        { name: '⛏️ Minas Activas', value: `\`${profile.generators.mines.toString()}\``, inline: true }
      )
      .setFooter({ text: 'Usa el comando de recolectar para pasar el oro pendiente a tu bolsillo.' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};