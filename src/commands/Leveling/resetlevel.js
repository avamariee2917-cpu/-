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

export default {
  data: new SlashCommandBuilder()
    .setName('resetlevel')
    .setDescription("Reset a user's level back to Level 1.")
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose level you want to reset.')
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

    if (!client.levelingData) {
      client.levelingData = {};
    }

    if (!client.levelingData[guildId]) {
      client.levelingData[guildId] = {};
    }

    /*
     * Reset the user's leveling data.
     */
    client.levelingData[guildId][targetUser.id] = {
      xp: 0,
      level: 1
    };

    /*
     * Remove every leveling role.
     */
    for (const roleId of Object.values(LEVEL_ROLES)) {
      if (targetMember.roles.cache.has(roleId)) {
        try {
          await targetMember.roles.remove(
            roleId,
            'Level reset to Level 1'
          );
        } catch (error) {
          console.error(
            `Failed to remove leveling role ${roleId}:`,
            error
          );
        }
      }
    }

    /*
     * Save the new data.
     */
    if (typeof client.saveLevelingData === 'function') {
      client.saveLevelingData();
    }

    return interaction.reply({
      content:
        `Reset <@${targetUser.id}>'s level to **1** and removed all leveling roles.`,
      ephemeral: false
    });
  }
};
