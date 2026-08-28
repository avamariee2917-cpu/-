import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
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
    .setName('rank')
    .setDescription('View your or another member\'s leveling rank.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose rank you want to view.')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Defer FIRST, but keep it inside the try/catch
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
      }

      const target =
        interaction.options.getUser('user') ||
        interaction.user;

      // Safely get leveling data
      const levelingData =
        interaction.client.levelingData;

      const guildId =
        interaction.guildId;

      const guildData =
        levelingData?.[guildId] || {};

      const userData =
        guildData?.[target.id] || {
          xp: 0,
          level: 1,
        };

      // Make sure XP and level are valid numbers
      const level = Math.max(
        1,
        Math.min(
          MAX_LEVEL,
          Number(userData.level) || 1
        )
      );

      const totalXP = Math.max(
        0,
        Number(userData.xp) || 0
      );

      // XP needed for the current level
      const currentLevelXP =
        (level - 1) * XP_PER_LEVEL;

      // XP earned inside the current level
      const xpIntoLevel = Math.max(
        0,
        totalXP - currentLevelXP
      );

      const xpNeededForNextLevel =
        XP_PER_LEVEL;

      const xpRemaining = Math.max(
        0,
        xpNeededForNextLevel - xpIntoLevel
      );

      const progress = Math.min(
        100,
        Math.floor(
          (xpIntoLevel / xpNeededForNextLevel) * 100
        )
      );

      const progressBar =
        level >= MAX_LEVEL
          ? '████████████████████'
          : createProgressBar(
              xpIntoLevel,
              xpNeededForNextLevel
            );

      const nextLevel =
        level >= MAX_LEVEL
          ? 'MAX'
          : level + 1;

      const avatarURL =
        target.displayAvatarURL({
          extension: 'png',
          size: 256,
        });

      const embed =
        new EmbedBuilder()
          .setAuthor({
            name: `${target.username}'s Rank`,
            iconURL: avatarURL,
          })
          .setThumbnail(avatarURL)
          .setDescription(
            `**Level ${level}**\n\n` +
            `**XP**\n` +
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
            text: `Level ${level} • ${totalXP.toLocaleString()} total XP`,
          })
          .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });

    } catch (error) {
      console.error('Rank command error:', error);

      // If we already acknowledged the interaction,
      // edit the existing reply instead of replying again.
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: 'I could not retrieve that member\'s rank.',
            embeds: [],
          });
        } else {
          await interaction.reply({
            content: 'I could not retrieve that member\'s rank.',
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (replyError) {
        console.error(
          'Rank error response failed:',
          replyError
        );
      }
    }
  },
};
