import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

// ============================================================
// LEVELING ROLES
// ============================================================

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

// ============================================================
// XP SETTINGS
// ============================================================

const XP_PER_LEVEL = 100;
const MAX_LEVEL = 100;
const MAX_XP =
  (MAX_LEVEL - 1) * XP_PER_LEVEL;

// ============================================================
// LEVEL CALCULATION
// ============================================================

function calculateLevel(xp) {
  const safeXP =
    Math.max(
      0,
      Number(xp) || 0
    );

  return Math.min(
    MAX_LEVEL,
    Math.floor(
      safeXP / XP_PER_LEVEL
    ) + 1
  );
}

// ============================================================
// COMMAND
// ============================================================

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

  // ==========================================================
  // EXECUTE
  // ==========================================================

  async execute(interaction) {

    await interaction.deferReply({
      ephemeral: true,
    });

    try {

      // ======================================================
      // GET TARGET
      // ======================================================

      const targetUser =
        interaction.options.getUser('user');

      const newXP =
        interaction.options.getInteger('xp');

      const guild =
        interaction.guild;

      const guildId =
        guild.id;

      // ======================================================
      // FETCH MEMBER
      // ======================================================

      const member =
        await guild.members.fetch(
          targetUser.id
        );

      // ======================================================
      // FETCH BOT MEMBER
      // ======================================================

      const botMember =
        guild.members.me ||
        await guild.members.fetchMe();

      if (!botMember) {

        return interaction.editReply(
          'I could not find my bot member in this server.'
        );

      }

      // ======================================================
      // CHECK MANAGE ROLES
      // ======================================================

      if (
        !botMember.permissions.has(
          PermissionFlagsBits.ManageRoles
        )
      ) {

        return interaction.editReply(
          'I do not have the **Manage Roles** permission, so I cannot give leveling roles.'
        );

      }

      // ======================================================
      // LEVEL DATA
      // ======================================================

      if (!interaction.client.levelingData) {

        interaction.client.levelingData = {};

      }

      if (
        !interaction.client.levelingData[guildId]
      ) {

        interaction.client.levelingData[guildId] =
          {};

      }

      // ======================================================
      // CALCULATE LEVEL
      // ======================================================

      const newLevel =
        calculateLevel(newXP);

      // ======================================================
      // SAVE XP + LEVEL
      // ======================================================

      interaction.client.levelingData[guildId][
        targetUser.id
      ] = {

        xp: newXP,

        level: newLevel,

      };

      // ======================================================
      // DETERMINE QUALIFYING ROLES
      // ======================================================

      const qualifyingRoleIds =
        new Set(
          ROLE_LEVELS
            .filter(
              roleLevel =>
                roleLevel <= newLevel
            )
            .map(
              roleLevel =>
                LEVEL_ROLES[roleLevel]
            )
        );

      // ======================================================
      // FETCH ALL LEVEL ROLES
      // ======================================================

      const roles =
        await guild.roles.fetch();

      // ======================================================
      // CHECK ROLE HIERARCHY
      // ======================================================

      const unmanageableRoles = [];

      for (
        const roleLevel of ROLE_LEVELS
      ) {

        const roleId =
          LEVEL_ROLES[roleLevel];

        const role =
          roles.get(roleId);

        if (!role) {

          console.warn(
            `Level ${roleLevel} role ${roleId} does not exist.`
          );

          continue;

        }

        if (
          role.position >=
          botMember.roles.highest.position
        ) {

          unmanageableRoles.push(
            `Level ${roleLevel} (${role.name})`
          );

        }

      }

      // ======================================================
      // REMOVE UNQUALIFIED ROLES
      // ======================================================

      let rolesRemoved = 0;

      for (
        const roleLevel of ROLE_LEVELS
      ) {

        const roleId =
          LEVEL_ROLES[roleLevel];

        // Keep roles the member qualifies for.
        if (
          qualifyingRoleIds.has(roleId)
        ) {
          continue;
        }

        // Member doesn't have this role.
        if (
          !member.roles.cache.has(roleId)
        ) {
          continue;
        }

        const role =
          roles.get(roleId);

        if (!role) {
          continue;
        }

        // Bot cannot manage this role.
        if (
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

      // ======================================================
      // ADD QUALIFYING ROLES
      // ======================================================

      let rolesAdded = 0;

      for (
        const roleLevel of ROLE_LEVELS
      ) {

        const roleId =
          LEVEL_ROLES[roleLevel];

        // Member does not qualify.
        if (
          !qualifyingRoleIds.has(roleId)
        ) {
          continue;
        }

        // Member already has it.
        if (
          member.roles.cache.has(roleId)
        ) {
          continue;
        }

        const role =
          roles.get(roleId);

        if (!role) {

          console.warn(
            `Level ${roleLevel} role ${roleId} could not be found.`
          );

          continue;

        }

        // ====================================================
        // ROLE HIERARCHY
        // ====================================================

        if (
          role.position >=
          botMember.roles.highest.position
        ) {

          console.error(
            `Cannot add Level ${roleLevel} role "${role.name}". ` +
            `The role is above or equal to the bot's highest role.`
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
            `Could not add Level ${roleLevel} role "${role.name}" to ${member.user.tag}:`,
            error
          );

        }

      }

      // ======================================================
      // SAVE LEVELING DATA
      // ======================================================

      if (
        typeof interaction.client.saveLevelingData ===
        'function'
      ) {

        interaction.client.saveLevelingData();

      }

      // ======================================================
      // ROLE SUMMARY
      // ======================================================

      const qualifyingRoles =
        ROLE_LEVELS.filter(
          roleLevel =>
            roleLevel <= newLevel
        );

      const roleText =
        qualifyingRoles.length > 0
          ? qualifyingRoles
              .map(
                level =>
                  `Level ${level}`
              )
              .join(', ')
          : 'None yet';

      // ======================================================
      // HIERARCHY WARNING
      // ======================================================

      let hierarchyWarning = '';

      if (
        unmanageableRoles.length > 0
      ) {

        hierarchyWarning =
          `\n\n**Role hierarchy warning:**\n` +
          `I cannot manage: ${unmanageableRoles.join(', ')}\n` +
          `Move the bot's highest role **above all of your leveling roles** in Server Settings → Roles.`;

      }

      // ======================================================
      // RESPONSE
      // ======================================================

      await interaction.editReply(

        `## XP Updated\n\n` +

        `<@${targetUser.id}>'s leveling progress has been updated.\n\n` +

        `**XP:** ${newXP}\n` +

        `**Level:** ${newLevel}\n` +

        `**Leveling roles:** ${roleText}\n` +

        `**Roles added:** ${rolesAdded}\n` +

        `**Roles removed:** ${rolesRemoved}` +

        hierarchyWarning

      );

    } catch (error) {

      console.error(
        'SetXP command error:',
        error
      );

      await interaction.editReply(
        'I could not change that member\'s XP. Check the bot permissions and role hierarchy.'
      );

    }

  },

};
