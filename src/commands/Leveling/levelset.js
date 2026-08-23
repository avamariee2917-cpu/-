import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

const LEVEL_ROLES = {
  5: '1532968053120307301',
  10: '1532969032557396018',
  20: '1532969099918053456',
  30: '1532969151419650099',
  40: '1532969195266904115',
  50: '1532969253005951117',
  60: '1532969414205509714',
  70: '1532969466353160232',
  80: '1532969543100793002',
  90: '1532969608452116601',
  100: '1532974501900451890',
};

const ROLE_LEVELS = Object.keys(LEVEL_ROLES)
  .map(Number)
  .sort((a, b) => a - b);

export default {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Set a member to a specific level.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose level you want to change.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The level to give the member.')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser =
        interaction.options.getUser('user');

      const newLevel =
        interaction.options.getInteger('level');

      const member =
        await interaction.guild.members.fetch(targetUser.id);

      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      if (!interaction.client.levelingData[interaction.guild.id]) {
        interaction.client.levelingData[interaction.guild.id] = {};
      }

      interaction.client.levelingData[
        interaction.guild.id
      ][targetUser.id] = {
        xp: Math.max(0, (newLevel - 1) * 100),
        level: newLevel,
      };

      const botMember = interaction.guild.members.me;

      if (!botMember) {
        return interaction.editReply(
          'I could not determine my own server permissions.'
        );
      }

      /*
       * Roles the member qualifies for.
       *
       * Level 54:
       * 5, 10, 20, 30, 40, 50
       */
      const qualifyingRoleIds = new Set(
        ROLE_LEVELS
          .filter(level => level <= newLevel)
          .map(level => LEVEL_ROLES[level])
      );

      /*
       * Remove roles the member no longer qualifies for.
       */
      for (const roleLevel of ROLE_LEVELS) {
        const roleId = LEVEL_ROLES[roleLevel];

        if (
          !qualifyingRoleIds.has(roleId) &&
          member.roles.cache.has(roleId)
        ) {
          const role =
            interaction.guild.roles.cache.get(roleId);

          if (!role) {
            continue;
          }

          if (
            role.position >=
            botMember.roles.highest.position
          ) {
            continue;
          }

          try {
            await member.roles.remove(
              role,
              `Level changed to ${newLevel}`
            );
          } catch (error) {
            console.error(
              `Could not remove level ${roleLevel} role:`,
              error
            );
          }
        }
      }

      /*
       * Give every role the member qualifies for.
       */
      for (const roleLevel of ROLE_LEVELS) {
        const roleId = LEVEL_ROLES[roleLevel];

        if (!qualifyingRoleIds.has(roleId)) {
          continue;
        }

        const role =
          interaction.guild.roles.cache.get(roleId);

        if (!role) {
          continue;
        }

        if (
          role.position >=
          botMember.roles.highest.position
        ) {
          continue;
        }

        if (!member.roles.cache.has(roleId)) {
          try {
            await member.roles.add(
              role,
              `Level changed to ${newLevel}`
            );
          } catch (error) {
            console.error(
              `Could not add level ${roleLevel} role:`,
              error
            );
          }
        }
      }

      if (typeof interaction.client.saveLevelingData === 'function') {
        interaction.client.saveLevelingData();
      }

      const rolesGiven =
        ROLE_LEVELS.filter(level => level <= newLevel);

      const roleText =
        rolesGiven.length > 0
          ? rolesGiven.join(', ')
          : 'None';

      await interaction.editReply(
        `Successfully set <@${targetUser.id}> to level **${newLevel}**.\n\n` +
        `Leveling roles: **${roleText}**`
      );

    } catch (error) {
      console.error('Setlevel command error:', error);

      await interaction.editReply(
        'I could not change that member\'s level. Check that I have permission to manage the leveling roles.'
      );
    }
  },
};
