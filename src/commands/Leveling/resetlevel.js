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

export default {
  data: new SlashCommandBuilder()
    .setName('resetlevel')
    .setDescription(
      'Reset one member back to Level 1 and 0 XP.'
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription(
          'The member whose leveling progress you want to reset.'
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser =
        interaction.options.getUser('user');

      const guildId =
        interaction.guild.id;

      /*
       * Make sure the leveling data exists.
       */
      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      if (!interaction.client.levelingData[guildId]) {
        interaction.client.levelingData[guildId] = {};
      }

      /*
       * Completely remove the member's saved
       * leveling data.
       *
       * The leveling system will automatically
       * treat them as Level 1 / 0 XP afterward.
       */
      delete interaction.client.levelingData[guildId][
        targetUser.id
      ];

      /*
       * Fetch the member so we can remove their
       * leveling roles.
       */
      const member =
        await interaction.guild.members.fetch(
          targetUser.id
        );

      /*
       * Get the bot's highest role so we can avoid
       * trying to manage roles above it.
       */
      const botMember =
        interaction.guild.members.me ||
        await interaction.guild.members.fetchMe();

      let rolesRemoved = 0;

      /*
       * Remove every leveling role from this member.
       */
      for (const roleId of Object.values(LEVEL_ROLES)) {
        if (!member.roles.cache.has(roleId)) {
          continue;
        }

        const role =
          interaction.guild.roles.cache.get(roleId);

        if (!role) {
          continue;
        }

        /*
         * Discord does not allow the bot to manage
         * roles that are equal to or higher than its
         * highest role.
         */
        if (
          botMember &&
          role.position >=
            botMember.roles.highest.position
        ) {
          console.warn(
            `Cannot remove ${role.name} from ${member.user.tag} because the role is above the bot's highest role.`
          );

          continue;
        }

        try {
          await member.roles.remove(
            role,
            'Member leveling progress reset'
          );

          rolesRemoved++;

        } catch (error) {
          console.error(
            `Could not remove leveling role ${role.name} from ${member.user.tag}:`,
            error
          );
        }
      }

      /*
       * Save the updated leveling data.
       */
      if (
        typeof interaction.client.saveLevelingData === 'function'
      ) {
        interaction.client.saveLevelingData();
      }

      await interaction.editReply(
        `## Level Reset\n\n` +
        `<@${targetUser.id}> has been reset.\n\n` +
        `**Level:** 1\n` +
        `**XP:** 0\n` +
        `**Leveling roles removed:** ${rolesRemoved}\n\n` +
        `They can now start earning XP again from Level 1.`
      );

    } catch (error) {
      console.error(
        'Reset level command error:',
        error
      );

      await interaction.editReply(
        'I could not reset that member\'s level. Check that the member exists and that I have permission to manage their leveling roles.'
      );
    }
  },
};
