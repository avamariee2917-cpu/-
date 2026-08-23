import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Set a user\'s level.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose level you want to change.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The level to give the user.')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator.toString()
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const level = interaction.options.getInteger('level');
    const client = interaction.client;

    if (!client.levelingData[interaction.guild.id]) {
      client.levelingData[interaction.guild.id] = {};
    }

    const xp = (level - 1) * 100;

    client.levelingData[interaction.guild.id][target.id] = {
      xp,
      level
    };

    if (typeof client.saveLevelingData === 'function') {
      client.saveLevelingData();
    }

    const member =
      await interaction.guild.members
        .fetch(target.id)
        .catch(() => null);

    if (member && level >= 5) {
      const availableLevels = Object.keys(client.levelRoles || {})
        .map(Number)
        .filter(lvl => lvl <= level)
        .sort((a, b) => b - a);

      const highestLevel = availableLevels[0];

      if (highestLevel) {
        const roleId = client.levelRoles[highestLevel];

        if (roleId && !member.roles.cache.has(roleId)) {
          await member.roles.add(
            roleId,
            `Set to level ${level}`
          );
        }

        const allLevelRoles =
          Object.values(client.levelRoles || {});

        for (const oldRoleId of allLevelRoles) {
          if (
            oldRoleId !== roleId &&
            member.roles.cache.has(oldRoleId)
          ) {
            await member.roles.remove(oldRoleId).catch(() => {});
          }
        }
      }
    }

    return interaction.reply({
      content:
        `${target}'s level has been set to **${level}**.`,
      ephemeral: false
    });
  }
};
