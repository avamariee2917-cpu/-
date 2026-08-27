import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  Role,
} from 'discord.js';

// ============================================================
// CONFIGURATION
// ============================================================

const OWNER_ID = '1531440557954437273';

const STAFF_ROLE_ID = '1532221464839848016';

const BOOSTER_ROLE_IDS = new Set([
  '1532269323584802836',
  '1533675708193177700',
]);

// All custom booster roles will be placed BELOW this role.
const CUSTOM_ROLE_PARENT_ID = '1531881126854004816';

// ============================================================
// HELPERS
// ============================================================

function isOwner(interaction) {
  return interaction.user.id === OWNER_ID;
}

function isStaff(interaction) {
  return interaction.member?.roles?.cache?.has(STAFF_ROLE_ID);
}

function isBooster(interaction) {
  return interaction.member?.roles?.cache?.some(role =>
    BOOSTER_ROLE_IDS.has(role.id)
  );
}

function canManageAll(interaction) {
  return isOwner(interaction) || isStaff(interaction);
}

function getCustomBoosterRole(member) {
  return member.guild.roles.cache.find(
    role =>
      role.managed === false &&
      role.name.startsWith('♱') &&
      role.tags?.botId === undefined &&
      role.id !== CUSTOM_ROLE_PARENT_ID &&
      role.members.has(member.id)
  );
}

function getAllCustomBoosterRoles(guild) {
  return guild.roles.cache.filter(role =>
    role.managed === false &&
    role.id !== CUSTOM_ROLE_PARENT_ID &&
    role.position < (
      guild.roles.cache.get(CUSTOM_ROLE_PARENT_ID)?.position ?? 0
    ) &&
    role.name.startsWith('♱')
  );
}

// ============================================================
// COMMAND
// ============================================================

export default {

  data: new SlashCommandBuilder()

    .setName('br')

    .setDescription('Manage your custom booster role.')

    // --------------------------------------------------------
    // /br set
    // --------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Create your custom booster role.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of your custom role.')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Hex color, for example #8B0000.')
            .setRequired(true)
            .setMaxLength(7)
        )
    )

    // --------------------------------------------------------
    // /br remove
    // --------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your custom booster role.')
    )

    // --------------------------------------------------------
    // /br rename
    // --------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('rename')
        .setDescription('Rename your custom booster role.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The new name for your role.')
            .setRequired(true)
            .setMaxLength(100)
        )
    )

    // --------------------------------------------------------
    // /br list
    // --------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all custom booster roles.')
    ),

  // ==========================================================
  // EXECUTE
  // ==========================================================

  async execute(interaction) {

    const subcommand =
      interaction.options.getSubcommand();

    // ========================================================
    // /br list
    // ========================================================

    if (subcommand === 'list') {

      if (!canManageAll(interaction)) {

        return interaction.reply({
          content:
            'You do not have permission to use this command.',
          ephemeral: true,
        });

      }

      const roles =
        getAllCustomBoosterRoles(interaction.guild);

      if (roles.size === 0) {

        return interaction.reply({
          content:
            'There are currently no custom booster roles.',
          ephemeral: true,
        });

      }

      const roleList =
        roles
          .map(role => {

            const members =
              [...role.members.values()];

            const owner =
              members[0];

            return `${role} — ${
              owner
                ? `<@${owner.id}>`
                : 'No member'
            }`;

          })
          .join('\n');

      return interaction.reply({
        content:
          `## Custom Booster Roles\n\n${roleList}`,
        ephemeral: true,
      });

    }

    // ========================================================
    // BOOSTER CHECK
    // ========================================================

    if (!isBooster(interaction)) {

      return interaction.reply({
        content:
          'You must be actively boosting the server to use this command.',
        ephemeral: true,
      });

    }

    // ========================================================
    // FIND EXISTING ROLE
    // ========================================================

    const existingRole =
      getCustomBoosterRole(interaction.member);

    // ========================================================
    // /br set
    // ========================================================

    if (subcommand === 'set') {

      if (existingRole) {

        return interaction.reply({
          content:
            `You already have a custom role: ${existingRole}\n\nUse \`/br rename\` if you want to rename it.`,
          ephemeral: true,
        });

      }

      const name =
        interaction.options.getString('name');

      const colorInput =
        interaction.options.getString('color');

      const color =
        colorInput.startsWith('#')
          ? colorInput
          : `#${colorInput}`;

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {

        return interaction.reply({
          content:
            'That is not a valid hex color. Example: `#8B0000`',
          ephemeral: true,
        });

      }

      const botMember =
        interaction.guild.members.me ||
        await interaction.guild.members.fetchMe();

      if (
        !botMember.permissions.has(
          PermissionFlagsBits.ManageRoles
        )
      ) {

        return interaction.reply({
          content:
            'I need the **Manage Roles** permission to create custom roles.',
          ephemeral: true,
        });

      }

      const parentRole =
        interaction.guild.roles.cache.get(
          CUSTOM_ROLE_PARENT_ID
        );

      if (!parentRole) {

        return interaction.reply({
          content:
            'I could not find the custom booster role placement role.',
          ephemeral: true,
        });

      }

      if (
        parentRole.position >=
        botMember.roles.highest.position
      ) {

        return interaction.reply({
          content:
            'My highest role must be **above** the custom booster role placement role before I can create custom roles.',
          ephemeral: true,
        });

      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        const role =
          await interaction.guild.roles.create({
            name: `♱ ${name}`,
            color,
            reason:
              `Custom booster role created for ${interaction.user.tag}`,
          });

        // Put the new role immediately below
        // the designated parent role.
        await role.setPosition(
          parentRole.position - 1,
          `Custom booster role for ${interaction.user.tag}`
        );

        await interaction.member.roles.add(
          role,
          'Custom booster role created'
        );

        return interaction.editReply({
          content:
            `## Custom Role Created\n\n` +
            `**Role:** ${role}\n` +
            `**Name:** ${role.name}\n` +
            `**Color:** ${color}\n\n` +
            `Your custom role has been placed below the designated booster-role position.`,
        });

      } catch (error) {

        console.error(
          'Error creating booster role:',
          error
        );

        return interaction.editReply({
          content:
            'I could not create your custom role. Check my **Manage Roles** permission and role hierarchy.',
        });

      }

    }

    // ========================================================
    // /br rename
    // ========================================================

    if (subcommand === 'rename') {

      if (!existingRole) {

        return interaction.reply({
          content:
            'You do not have a custom booster role yet. Use `/br set` first.',
          ephemeral: true,
        });

      }

      const newName =
        interaction.options.getString('name');

      const botMember =
        interaction.guild.members.me ||
        await interaction.guild.members.fetchMe();

      if (
        existingRole.position >=
        botMember.roles.highest.position
      ) {

        return interaction.reply({
          content:
            'I cannot manage your custom role because it is above my highest role.',
          ephemeral: true,
        });

      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        await existingRole.setName(
          `♱ ${newName}`,
          `Custom booster role renamed by ${interaction.user.tag}`
        );

        return interaction.editReply({
          content:
            `Your custom booster role has been renamed to **${existingRole.name}**.`,
        });

      } catch (error) {

        console.error(
          'Error renaming booster role:',
          error
        );

        return interaction.editReply({
          content:
            'I could not rename your custom role.',
        });

      }

    }

    // ========================================================
    // /br remove
    // ========================================================

    if (subcommand === 'remove') {

      if (!existingRole) {

        return interaction.reply({
          content:
            'You do not have a custom booster role to remove.',
          ephemeral: true,
        });

      }

      const botMember =
        interaction.guild.members.me ||
        await interaction.guild.members.fetchMe();

      if (
        existingRole.position >=
        botMember.roles.highest.position
      ) {

        return interaction.reply({
          content:
            'I cannot remove your custom role because it is above my highest role.',
          ephemeral: true,
        });

      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        await existingRole.delete(
          `Custom booster role removed by ${interaction.user.tag}`
        );

        return interaction.editReply({
          content:
            'Your custom booster role has been removed.',
        });

      } catch (error) {

        console.error(
          'Error removing booster role:',
          error
        );

        return interaction.editReply({
          content:
            'I could not remove your custom role.',
        });

      }

    }

  },

};
