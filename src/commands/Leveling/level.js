import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

const XP_PER_LEVEL = 100;
const MAX_LEVEL = 100;

function createProgressBar(currentXP, requiredXP, size = 20) {
  const progress = Math.min(
    Math.max(currentXP / requiredXP, 0),
    1
  );

  const filled = Math.round(progress * size);
  const empty = size - filled;

  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your current level and XP.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const levelingData =
        interaction.client.levelingData;

      const guildData =
        levelingData?.[interaction.guild.id] || {};

      const userData =
        guildData[interaction.user.id] || {
          xp: 0,
          level: 1,
        };

      const level =
        Math.max(
          1,
          Math.min(
            MAX_LEVEL,
            Number(userData.level) || 1
          )
        );

      const totalXP =
        Math.max(
          0,
          Number(userData.xp) || 0
        );

      // XP required at the beginning of the current level
      const currentLevelXP =
        (level - 1) * XP_PER_LEVEL;

      // XP earned inside the current level
      const xpIntoLevel =
        Math.max(
          0,
          totalXP - currentLevelXP
        );

      const progress =
        Math.min(
          100,
          Math.floor(
            (xpIntoLevel / XP_PER_LEVEL) * 100
          )
        );

      const nextLevel =
        level >= MAX_LEVEL
          ? 'MAX'
          : level + 1;

      const xpRemaining =
        Math.max(
          0,
          XP_PER_LEVEL - xpIntoLevel
        );

      const progressBar =
        level >= MAX_LEVEL
          ? '████████████████████'
          : createProgressBar(
              xpIntoLevel,
              XP_PER_LEVEL
            );

      const embed =
        new EmbedBuilder()
          .setAuthor({
            name: `${interaction.user.username}'s Level`,
            iconURL:
              interaction.user.displayAvatarURL({
                extension: 'png',
                size: 256,
              }),
          })
          .setThumbnail(
            interaction.user.displayAvatarURL({
              extension: 'png',
              size: 256,
            })
          )
          .setDescription(
            `### Level ${level}\n\n` +

            `**Total XP**\n` +
            `${totalXP.toLocaleString()} XP\n\n` +

            `**Progress to Level ${nextLevel}**\n` +
            `${progressBar} **${progress}%**\n\n` +

            (
              level >= MAX_LEVEL
                ? '**MAX LEVEL REACHED**'
                : `**${xpRemaining} XP** until Level ${nextLevel}`
            )
          )
          .setFooter({
            text:
              `Level ${level} • ${totalXP.toLocaleString()} total XP`,
          })
          .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });

    } catch (error) {
      console.error(
        'Level command error:',
        error
      );

      await interaction.editReply(
        'I could not retrieve your leveling information.'
      );
    }
  },
};
