// commands/mascota.js
const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags 
} = require('discord.js');
const { getUserProfile, saveUserProfile } = require('../utils/game');
const { rollPetFromEgg, EGGS } = require('../data/pets');
const { generateHatchCard, generatePetCard } = require('../utils/petCanvas');

// ⚙️ Cantidad de mascotas visibles por página
const ITEMS_PER_PAGE = 8;

// 🛠️ Helper para extraer emojis personalizados (<:name:id>) o unicode y limpiar el texto
function parseEmojiAndCleanText(text) {
  if (!text) return { cleanText: '', emoji: null };

  const customMatch = text.match(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/);
  let emoji = null;

  if (customMatch) {
    emoji = {
      animated: Boolean(customMatch[1]),
      name: customMatch[2],
      id: customMatch[3]
    };
  }

  const cleanText = text.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '').replace(/\s+/g, ' ').trim();

  return { cleanText, emoji };
}

module.exports = {
  name: 'mascota',
  aliases: ['mascotas', 'pet', 'eclosionar'],

  async execute(message) {
    let profile = getUserProfile(message.author.id);

    if (!profile.pets) profile.pets = [];
    if (!profile.inventory) profile.inventory = [];

    // Estado local de la página actual (empieza en 0)
    let currentPage = 0;

    // Helper para obtener ÚNICAMENTE huevos válidos con cantidad > 0
    const getAvailableEggs = (prof) => {
      return (prof.inventory || []).filter(i => i.type === 'egg' && Number(i.count) > 0);
    };

    // Generar la tarjeta de la mascota equipada actual
    const petCardBuffer = await generatePetCard(profile.equippedPet, message.author.username);
    let attachment = new AttachmentBuilder(petCardBuffer, { name: 'pet-profile.png' });

    // 📄 CREADOR DE EMBED CON PAGINACIÓN
    const createPetEmbed = (prof, page = 0) => {
      const totalPets = prof.pets.length;
      const totalPages = Math.ceil(totalPets / ITEMS_PER_PAGE) || 1;
      const validPage = Math.min(Math.max(0, page), totalPages - 1);

      let collectionText = '*No tienes mascotas en tu colección.*';
      if (totalPets > 0) {
        const start = validPage * ITEMS_PER_PAGE;
        const pagePets = prof.pets.slice(start, start + ITEMS_PER_PAGE);

        collectionText = pagePets.map((p, idx) => {
          const globalIndex = start + idx + 1;
          const isEquipped = prof.equippedPet && prof.equippedPet.uid === p.uid ? ' **(Equipada)**' : '';
          return `**[${globalIndex}]** ${p.emoji} **${p.name}** (${p.rarity})${isEquipped}`;
        }).join('\n');
      }

      const availableEggs = getAvailableEggs(prof);
      let eggsText = '*Sin huevos para eclosionar.*';
      if (availableEggs.length > 0) {
        eggsText = availableEggs.map(e => `**${e.name}** x${e.count}`).join('\n');
      }

      return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`🐾 Refugio de Mascotas - ${message.author.username}`)
        .setImage('attachment://pet-profile.png')
        .addFields(
          { name: `🎒 Colección de Mascotas (${totalPets} en total)`, value: collectionText, inline: false },
          { name: '🥚 Huevos en Inventario', value: eggsText, inline: false }
        )
        .setFooter({ text: `Página ${validPage + 1} de ${totalPages}` });
    };

    // 🎛️️ CREADOR DE COMPONENTES (BOTONES Y MENÚS)
    const createComponents = (prof, page = 0) => {
      const rows = [];
      const totalPets = prof.pets.length;
      const totalPages = Math.ceil(totalPets / ITEMS_PER_PAGE) || 1;
      const validPage = Math.min(Math.max(0, page), totalPages - 1);

      // 1. Selector de Huevos para eclosionar
      const availableEggs = getAvailableEggs(prof);
      if (availableEggs.length > 0) {
        const eggOptions = availableEggs.map((egg) => {
          const { cleanText, emoji } = parseEmojiAndCleanText(egg.name);
          return {
            label: `Eclosionar: ${cleanText}`,
            value: `hatch:${egg.id}`,
            description: `Consumirá 1x ${cleanText}`,
            emoji: emoji || '🥚'
          };
        });

        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_hatch_egg')
            .setPlaceholder('🐣 Selecciona un huevo para eclosionar...')
            .addOptions(eggOptions.slice(0, 25))
        ));
      }

      // 2. Selector de Equipar Mascotas (Muestra solo las mascotas de la página actual)
      if (totalPets > 0) {
        const start = validPage * ITEMS_PER_PAGE;
        const pagePets = prof.pets.slice(start, start + ITEMS_PER_PAGE);

        const petOptions = pagePets.map((p) => {
          const { cleanText: cleanName, emoji: nameEmoji } = parseEmojiAndCleanText(p.name);
          const { emoji: petEmoji } = parseEmojiAndCleanText(p.emoji);

          return {
            label: `Equipar: ${cleanName} (${p.rarity})`,
            value: `equip:${p.uid}`,
            description: `+${p.stats.atk} ATK | +${p.stats.def} DEF | +${p.stats.hp} HP`,
            emoji: nameEmoji || petEmoji || '⚔️'
          };
        });

        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_equip_pet')
            .setPlaceholder('⚔️ Selecciona una mascota de esta página para equipar...')
            .addOptions(petOptions)
        ));
      }

      // 3. Botones de Navegación de Páginas (Aparecen si hay más de 1 página)
      if (totalPages > 1) {
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('◀️ Anterior')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(validPage === 0),
          new ButtonBuilder()
            .setCustomId('page_indicator')
            .setLabel(`${validPage + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Siguiente ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(validPage >= totalPages - 1)
        ));
      }

      return rows;
    };

    const replyMsg = await message.reply({
      embeds: [createPetEmbed(profile, currentPage)],
      files: [attachment],
      components: createComponents(profile, currentPage)
    });

    const collector = replyMsg.createMessageComponentCollector({ time: 120000 }); // Tiempo de interactividad: 2 min

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: '❌ Este no es tu panel de mascotas.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      // ⚡ DIFERIR INMEDIATAMENTE LA INTERACCIÓN (Evita el error 10062)
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate();
        }
      } catch (err) {
        // Si la interacción expiro antes de ser diferida, ignoramos para prevenir un crash
        return;
      }

      // Recargar perfil actual de la DB para evitar desincronizaciones
      profile = getUserProfile(message.author.id);

      const totalPages = Math.ceil(profile.pets.length / ITEMS_PER_PAGE) || 1;

      // ◀️ PÁGINA ANTERIOR
      if (interaction.customId === 'prev_page') {
        if (currentPage > 0) currentPage--;
        await interaction.editReply({
          embeds: [createPetEmbed(profile, currentPage)],
          components: createComponents(profile, currentPage)
        }).catch(() => {});
      }

      // ▶️ PÁGINA SIGUIENTE
      else if (interaction.customId === 'next_page') {
        if (currentPage < totalPages - 1) currentPage++;
        await interaction.editReply({
          embeds: [createPetEmbed(profile, currentPage)],
          components: createComponents(profile, currentPage)
        }).catch(() => {});
      }

      // 🐣 ECLOSIÓN VISUAL ANIMADA (GIF) CON CANVAS
      else if (interaction.customId === 'select_hatch_egg') {
        const selectedValue = interaction.values[0];
        const eggId = selectedValue.replace('hatch:', '');

        const eggIndex = profile.inventory.findIndex(i => i.id === eggId && i.type === 'egg');
        if (eggIndex === -1 || (profile.inventory[eggIndex].count || 0) <= 0) {
          return interaction.followUp({ content: '❌ Ya no tienes este huevo.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        // 1. Clonar los datos del huevo y vincular la imagen desde EGGS
        const eggData = EGGS[eggId] || {};
        const eggItem = { 
          ...profile.inventory[eggIndex],
          image: profile.inventory[eggIndex].image || eggData.image || null
        };

        // 2. Consumir 1 unidad del huevo
        profile.inventory[eggIndex].count -= 1;
        profile.inventory = profile.inventory.filter(i => (i.count || 0) > 0);

        // 3. Generar la mascota con stats únicas
        const newPet = rollPetFromEgg(eggId);
        profile.pets.push(newPet);

        if (!profile.equippedPet) {
          profile.equippedPet = newPet;
        }

        // 🗄️ GUARDAR EN SQLITE
        saveUserProfile(profile);

        // 4. Generar animación GIF
        const hatchGifBuffer = await generateHatchCard(newPet, message.author.username, eggItem);
        const hatchAttachment = new AttachmentBuilder(hatchGifBuffer, { name: 'hatch-result.gif' });

        const hatchEmbed = new EmbedBuilder()
          .setColor(newPet.color || '#FFD700')
          .setTitle(`🎉 ¡EL HUEVO HA ECLOSIONADO!`)
          .setImage('attachment://hatch-result.gif');

        await interaction.editReply({
          embeds: [hatchEmbed],
          files: [hatchAttachment],
          components: []
        }).catch(() => {});

        // Restaurar el panel interactivo tras 7.5s de animación
        setTimeout(async () => {
          const updatedProfile = getUserProfile(message.author.id);

          const updatedCardBuffer = await generatePetCard(updatedProfile.equippedPet, message.author.username);
          const updatedAttachment = new AttachmentBuilder(updatedCardBuffer, { name: 'pet-profile.png' });

          // Ajustar la página si la nueva mascota amplió el número total de páginas
          const newTotalPages = Math.ceil(updatedProfile.pets.length / ITEMS_PER_PAGE) || 1;
          if (currentPage >= newTotalPages) currentPage = newTotalPages - 1;

          await interaction.editReply({
            embeds: [createPetEmbed(updatedProfile, currentPage)],
            files: [updatedAttachment],
            components: createComponents(updatedProfile, currentPage)
          }).catch(() => {});
        }, 7500);
      }

      // ⚔️ EQUIPAR MASCOTA
      else if (interaction.customId === 'select_equip_pet') {
        const petUid = interaction.values[0].replace('equip:', '');
        const targetPet = profile.pets.find(p => p.uid === petUid);

        if (targetPet) {
          profile.equippedPet = targetPet;

          // 🗄 GUARDAR EN SQLITE
          saveUserProfile(profile);

          const updatedProfile = getUserProfile(message.author.id);

          const updatedCardBuffer = await generatePetCard(updatedProfile.equippedPet, message.author.username);
          const updatedAttachment = new AttachmentBuilder(updatedCardBuffer, { name: 'pet-profile.png' });

          await interaction.editReply({
            embeds: [createPetEmbed(updatedProfile, currentPage)],
            files: [updatedAttachment],
            components: createComponents(updatedProfile, currentPage)
          }).catch(() => {});

          await interaction.followUp({
            content: `✅ Te has equipado a **${targetPet.emoji} ${targetPet.name}**.`,
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        }
      }
    });

    collector.on('end', () => {
      replyMsg.edit({ components: [] }).catch(() => {});
    });
  }
};