import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resetlevel')
    .setDescription("Reset a user's level and XP.")
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose level you want to reset.')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator.toString()
    ),

  async execute(interaction) {
    const client = interaction.client;
    const target = interaction.options.getUser('user');

    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
    }

    if (!client.levelingData[interaction.guild.id]) {
      client.levelingData[interaction.guild.id] = {};
    }

    client.levelingData[interaction.guild.id][target.id] = {
      xp: 0,
      level: 1
    };

    if (typeof client.saveLevelingData === 'function') {
      client.saveLevelingData();
    }

    const member = await interaction.guild.members
      .fetch(target.id)
      .catch(() => null);

    if (member) {
      const levelRoleIds = Object.values(client.levelRoles || {});

      for (const roleId of levelRoleIds) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(
            roleId,
            'Level reset'
          ).catch(() => {});
        }
      }
    }

    return interaction.reply({
      content: `${target}'s level has been reset to **1** with **0 XP**.`,
      ephemeral: false
    });
  }
};
