import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or another member\'s rank.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose rank you want to view.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const target =
      interaction.options.getUser('user') || interaction.user;

    const levelingData = interaction.client.levelingData;

    if (!levelingData) {
      return interaction.editReply(
        'The leveling system is not currently available.'
      );
    }

    const guildData = levelingData[interaction.guild.id];

    const userData =
      guildData?.[target.id] || {
        level: 1,
        xp: 0,
      };

    const level = userData.level || 1;
    const xp = userData.xp || 0;

    await interaction.editReply(
      `<@${target.id}> is level **${level}** with **${xp} XP**.`
    );
  },
};
