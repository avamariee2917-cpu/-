import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

const MAX_USERS = 20;

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const levelingData =
        interaction.client.levelingData;

      const guildData =
        levelingData?.[interaction.guild.id] || {};

      // --------------------------------------------------
      // Get users who have actually earned XP
      // --------------------------------------------------

      const users = Object.entries(guildData)
        .map(([userId, data]) => ({
          userId,

          xp: Math.max(
            0,
            Number(data?.xp) || 0
          ),

          level: Math.max(
            1,
            Number(data?.level) || 1
          ),
        }))
        .filter(user => user.xp > 0)
        .sort((a, b) => {
          // Highest level first
          if (b.level !== a.level) {
            return b.level - a.level;
          }

          // Highest XP first when level is tied
          return b.xp - a.xp;
        });

      // --------------------------------------------------
      // No users yet
      // --------------------------------------------------

      if (users.length === 0) {
        const emptyEmbed =
          new EmbedBuilder()
            .setTitle('Leveling Leaderboard')
            .setDescription(
              'There are currently no members with XP on the leaderboard.'
            )
            .setTimestamp();

        return interaction.editReply({
          embeds: [emptyEmbed],
        });
      }

      // --------------------------------------------------
      // Limit leaderboard
      // --------------------------------------------------

      const topUsers =
        users.slice(0, MAX_USERS);

      // --------------------------------------------------
      // Build leaderboard entries
      // --------------------------------------------------

      const lines = [];

      for (
        let index = 0;
        index < topUsers.length;
        index++
      ) {
        const user =
          topUsers[index];

        let member;

        try {
          member =
            await interaction.guild.members.fetch(
              user.userId
            );
        } catch {
          member = null;
        }

        const username =
          member?.user?.username ||
          `User ${user.userId}`;

        const position =
          index + 1;

        let prefix;

        if (position === 1) {
          prefix = '🥇';
        } else if (position === 2) {
          prefix = '🥈';
        } else if (position === 3) {
          prefix = '🥉';
        } else {
          prefix = `**${position}.**`;
        }

        lines.push(
          `${prefix} <@${user.userId}> — **Level ${user.level}** • **${user.xp.toLocaleString()} XP**`
        );
      }

      // --------------------------------------------------
      // Find the user's position
      // --------------------------------------------------

      const userPosition =
        users.findIndex(
          user =>
            user.userId === interaction.user.id
        );

      let footerText =
        `Top ${topUsers.length} members`;

      if (userPosition !== -1) {
        footerText +=
          ` • Your rank: #${userPosition + 1}`;
      }

      // --------------------------------------------------
      // Create leaderboard embed
      // --------------------------------------------------

      const embed =
        new EmbedBuilder()
          .setTitle(
            `${interaction.guild.name} • Leveling Leaderboard`
          )
          .setDescription(
            lines.join('\n')
          )
          .setFooter({
            text: footerText,
            iconURL:
              interaction.guild.iconURL({
                extension: 'png',
                size: 128,
              }) || undefined,
          })
          .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });

    } catch (error) {
      console.error(
        'Leaderboard command error:',
        error
      );

      await interaction.editReply(
        'I could not load the leveling leaderboard.'
      );
    }
  },
};
