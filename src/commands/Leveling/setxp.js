import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set a member\'s XP.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose XP you want to change.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('xp')
        .setDescription('The amount of XP to give.')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(9900)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser =
        interaction.options.getUser('user');

      const xp =
        interaction.options.getInteger('xp');

      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      if (!interaction.client.levelingData[interaction.guild.id]) {
        interaction.client.levelingData[interaction.guild.id] = {};
      }

      const level =
        Math.min(100, Math.floor(xp / 100) + 1);

      interaction.client.levelingData[
        interaction.guild.id
      ][targetUser.id] = {
        xp,
        level,
      };

      if (typeof interaction.client.saveLevelingData === 'function') {
        interaction.client.saveLevelingData();
      }

      await interaction.editReply(
        `Successfully set <@${targetUser.id}> to **${xp} XP** and level **${level}**.`
      );

    } catch (error) {
      console.error('SetXP command error:', error);

      await interaction.editReply(
        'I could not change that member\'s XP.'
      );
    }
  },
};
