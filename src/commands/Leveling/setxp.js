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

const XP_PER_LEVEL = 100;
const MAX_LEVEL = 100;
const MAX_XP = (MAX_LEVEL - 1) * XP_PER_LEVEL;

/*
 * Convert XP into a level.
 *
 * 0 XP   = Level 1
 * 100 XP = Level 2
 * 400 XP = Level 5
 * 4900 XP = Level 50
 * 9900 XP = Level 100
 */
function calculateLevel(xp) {
  return Math.min(
    MAX_LEVEL,
    Math.floor(xp / XP_PER_LEVEL) + 1
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription(
      'Set a member\'s XP and automatically update their level.'
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription(
          'The member whose XP you want to change.'
        )
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('xp')
        .setDescription(
          'The amount of XP to give the member.'
        )
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(MAX_XP)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser =
        interaction.options.getUser('user');

      const newXP =
        interaction.options.getInteger('xp');

      const guildId =
        interaction.guild.id;

      /*
       * Fetch the actual member.
       */
      const member =
        await interaction.guild.members.fetch(
          targetUser.id
        );

      /*
       * Make sure leveling data exists.
       */
      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      if (!interaction.client.levelingData[guildId]) {
        interaction.client.levelingData[guildId] = {};
      }

      /*
       * Calculate the new level.
       */
      const newLevel =
        calculateLevel(newXP);

      /*
       * Save the member's XP and level.
       */
      interaction.client.levelingData[guildId][
        targetUser.id
      ] = {
        xp: newXP,
        level: newLevel,
      };

      /*
       * Get the bot's highest role.
       */
      const botMember =
        interaction.guild.members.me ||
        await interaction.guild.members.fetchMe();

      let rolesAdded = 0;
      let rolesRemoved = 0;

      /*
       * Determine every role the member qualifies for.
       *
       * Example:
       * Level 54 gets:
       * Level 5
       * Level 10
       * Level 20
       * Level 30
       * Level 40
       * Level 50
       */
      const qualifyingRoleIds =
        new Set(
          ROLE_LEVELS
            .filter(roleLevel =>
              roleLevel <= newLevel
            )
            .map(roleLevel =>
              LEVEL_ROLES[roleLevel]
            )
        );

      /*
       * Remove roles the member no longer qualifies for.
       */
      for (const roleLevel of ROLE_LEVELS) {
        const roleId =
          LEVEL_ROLES[roleLevel];

        if (qualifyingRoleIds.has(roleId)) {
          continue;
        }

        if (!member.roles.cache.has(roleId)) {
          continue;
        }

        const role =
          interaction.guild.roles.cache.get(roleId);

        if (!role) {
          continue;
        }

        /*
         * Make sure the bot can manage this role.
         */
        if (
          botMember &&
          role.position >=
            botMember.roles.highest.position
        ) {
          console.warn(
            `Cannot remove ${role.name}; it is above the bot's highest role.`
          );

          continue;
        }

        try {
          await member.roles.remove(
            role,
            `XP manually changed to ${newXP}`
          );

          rolesRemoved++;

        } catch (error) {
          console.error(
            `Could not remove ${role.name} from ${member.user.tag}:`,
            error
          );
        }
      }

      /*
       * Give every role the member qualifies for.
       */
      for (const roleLevel of ROLE_LEVELS) {
        const roleId =
          LEVEL_ROLES[roleLevel];

        if (!qualifyingRoleIds.has(roleId)) {
          continue;
        }

        if (member.roles.cache.has(roleId)) {
          continue;
        }

        const role =
          interaction.guild.roles.cache.get(roleId);

        if (!role) {
          console.warn(
            `Could not find leveling role for level ${roleLevel}.`
          );

          continue;
        }

        /*
         * Make sure the bot can manage this role.
         */
        if (
          botMember &&
          role.position >=
            botMember.roles.highest.position
        ) {
          console.warn(
            `Cannot add ${role.name}; it is above the bot's highest role.`
          );

          continue;
        }

        try {
          await member.roles.add(
            role,
            `XP manually changed to ${newXP}`
          );

          rolesAdded++;

        } catch (error) {
          console.error(
            `Could not add ${role.name} to ${member.user.tag}:`,
            error
          );
        }
      }

      /*
       * Save everything.
       */
      if (
        typeof interaction.client.saveLevelingData ===
        'function'
      ) {
        interaction.client.saveLevelingData();
      }

      /*
       * Create a readable list of the roles the member
       * should have at this level.
       */
      const qualifyingRoles =
        ROLE_LEVELS.filter(
          roleLevel =>
            roleLevel <= newLevel
        );

      const roleText =
        qualifyingRoles.length > 0
          ? qualifyingRoles
              .map(level => `Level ${level}`)
              .join(', ')
          : 'None yet';

      await interaction.editReply(
        `## XP Updated\n\n` +
        `<@${targetUser.id}>\'s leveling progress has been updated.\n\n` +
        `**XP:** ${newXP}\n` +
        `**Level:** ${newLevel}\n` +
        `**Leveling roles:** ${roleText}\n` +
        `**Roles added:** ${rolesAdded}\n` +
        `**Roles removed:** ${rolesRemoved}`
      );

    } catch (error) {
      console.error(
        'SetXP command error:',
        error
      );

      await interaction.editReply(
        'I could not change that member\'s XP. Check the bot permissions and try again.'
      );
    }
  },
};
