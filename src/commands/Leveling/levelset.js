import { SlashCommandBuilder } from 'discord.js';

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
  100: '1532974501900451890'
};

const MAX_LEVEL = 100;

export default {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription("Set a user's level.")
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
        .setMaxValue(MAX_LEVEL)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
    }

    const client = interaction.client;

    if (!client.levelingData) {
      client.levelingData = {};
    }

    const guildId = interaction.guild.id;
    const targetUser = interaction.options.getUser('user');
    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        content: 'That user is not currently a member of this server.',
        ephemeral: true
      });
    }

    const level = interaction.options.getInteger('level');

    if (!client.levelingData[guildId]) {
      client.levelingData[guildId] = {};
    }

    /*
     * Each level requires 100 XP.
     *
     * Level 1 = 0 XP
     * Level 2 = 100 XP
     * Level 10 = 900 XP
     * Level 54 = 5300 XP
     */
    const xp = (level - 1) * 100;

    client.levelingData[guildId][targetUser.id] = {
      xp,
      level
    };

    /*
     * Give every leveling role at or below
     * the user's new level.
     */
    const roleLevels = Object.keys(LEVEL_ROLES)
      .map(Number)
      .sort((a, b) => a - b);

    const qualifyingRoleIds = roleLevels
      .filter(roleLevel => roleLevel <= level)
      .map(roleLevel => LEVEL_ROLES[roleLevel]);

    /*
     * Remove leveling roles that the user
     * should no longer have.
     */
    for (const roleLevel of roleLevels) {
      const roleId = LEVEL_ROLES[roleLevel];

      if (roleLevel > level && targetMember.roles.cache.has(roleId)) {
        try {
          await targetMember.roles.remove(
            roleId,
            `Level manually set to ${level}`
          );
        } catch (error) {
          console.error(
            `Failed to remove level ${roleLevel} role:`,
            error
          );
        }
      }
    }

    /*
     * Add every role the user qualifies for.
     */
    for (const roleId of qualifyingRoleIds) {
      if (!targetMember.roles.cache.has(roleId)) {
        try {
          await targetMember.roles.add(
            roleId,
            `Level manually set to ${level}`
          );
        } catch (error) {
          console.error(
            `Failed to add leveling role ${roleId}:`,
            error
          );
        }
      }
    }

    /*
     * Save the leveling data.
     */
    if (typeof client.saveLevelingData === 'function') {
      client.saveLevelingData();
    }

    return interaction.reply({
      content:
        `Set <@${targetUser.id}>'s level to **${level}** and updated their leveling roles.`,
      ephemeral: false
    });
  }
};
