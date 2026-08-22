import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

import {
  addXP,
} from '../../services/levelingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add-xp')
    .setDescription('Give XP to a user.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to give XP to')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount of XP to add')
        .setMinValue(1)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser('user');

    const amount =
      interaction.options.getInteger('amount');

    const member =
      await interaction.guild.members
        .fetch(target.id);

    const result =
      await addXP(
        member,
        amount
      );

    await interaction.reply({
      content:
        `Added **${amount} XP** to ${target.username}.\n` +
        `Level: **${result.newLevel}**\n` +
        `Total XP: **${result.xp}**`,
    });
  },
};
