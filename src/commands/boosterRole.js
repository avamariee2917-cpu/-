import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

// ============================================================
// CONFIG
// ============================================================

const OWNER_ID = '1531440557954437273';

const STAFF_ROLE_ID = '1532221464839848016';

const BOOSTER_ROLE_IDS = [
  '1532269323584802836',
  '1533675708193177700',
];

const CUSTOM_ROLE_PARENT_ID = '1531881126854004816';

// ============================================================
// HELPERS
// ============================================================

function isOwner(interaction) {
  return interaction.user.id === OWNER_ID;
}

function isStaff(interaction) {
  return (
    isOwner(interaction) ||
    interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)
  );
}

function isBooster(interaction) {
  return (
    isOwner(interaction) ||
    BOOSTER_ROLE_IDS.some(roleId =>
      interaction.member?.roles?.cache?.has(roleId)
    )
  );
}

function getCustomRole(member) {
  return member.roles.cache.find(role =>
    role.name.startsWith(`✦ ${member.user.username}`)
  );
}

// ============================================================
// COMMAND
// ============================================================

export default {

  data: new SlashCommandBuilder()

    .setName('br')

    .setDescription('Manage your custom booster role.')

    // ----------------------------------------------------------
    // /br set
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // /br remove
    // ----------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your custom booster role.')
    )

    // ----------------------------------------------------------
    // /br rename
    // ----------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('rename')
        .setDescription('Rename your existing custom booster role.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The new name for your custom role.')
            .setRequired(true)
            .setMaxLength(100)
        )
    )

    // ----------------------------------------------------------
    // /br list
    // ----------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all custom booster roles.')
    )

    // ----------------------------------------------------------
    // /br remove-user
    // ----------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-user')
        .setDescription('Remove a booster custom role.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The booster whose role should be removed.')
            .setRequired(true)
        )
    ),

  // ==========================================================
  // EXECUTE
  // ==========================================================

  async execute(interaction) {

    const subcommand =
      interaction.options.getSubcommand();

    // ========================================================
    // PERMISSION CHECK
    // ========================================================

    if (!isBooster(interaction) && !isStaff(interaction)) {

      return interaction.reply({
        content:
          'You must be a server booster or staff member to use this command.',
        ephemeral: true,
      });

    }

    // ========================================================
    // /br set
    // ========================================================

    if (subcommand === 'set') {

      if (!isBooster(interaction)) {

        return interaction.reply({
          content:
            'Only server boosters can create a custom booster role.',
          ephemeral: true,
        });

      }

      const name =
        interaction.options.getString('name');

      const color =
        interaction.options.getString('color');

      // Validate hex color

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {

        return interaction.reply({
          content:
            'Invalid color. Please use a hex color such as `#8B0000`.',
          ephemeral: true,
        });

      }

      const existingRole =
        getCustomRole(interaction.member);

      if (existingRole) {

        return interaction.reply({
          content:
            `You already have a custom role: <@&${existingRole.id}>`,
          ephemeral: true,
        });

      }

      const botMember =
        interaction.guild.members.me ||
        await interaction.guild.members.fetchMe();

      if (!botMember.permissions.has(
        PermissionFlagsBits.ManageRoles
      )) {

        return interaction.reply({
          content:
            'I need the **Manage Roles** permission to create your custom role.',
          ephemeral: true,
        });

      }

      const role =
        await interaction.guild.roles.create({
          name,
          color,
          reason:
            `Custom booster role for ${interaction.user.tag}`,
        });

      // Move the role underneath the custom-role parent role

      const parentRole =
        interaction.guild.roles.cache.get(
          CUSTOM_ROLE_PARENT_ID
        );

      if (parentRole) {

        try {

          await role.setPosition(
            parentRole.position - 1,
            `Positioning custom booster role for ${interaction.user.tag}`
          );

        } catch (error) {

          console.error(
            'Could not position booster role:',
            error
          );

        }

      }

      await interaction.member.roles.add(
        role,
        'Custom booster role created'
      );

      return interaction.reply({
        content:
          `Your custom booster role has been created: <@&${role.id}>`,
        ephemeral: true,
      });

    }

    // ========================================================
    // /br remove
    // ========================================================

    if (subcommand === 'remove') {

      const role =
        getCustomRole(interaction.member);

      if (!role) {

        return interaction.reply({
          content:
            'You do not have a custom booster role.',
          ephemeral: true,
        });

      }

      await interaction.member.roles.remove(
        role,
        'Booster removed their custom role'
      );

      await role.delete(
        'Booster removed their custom role'
      );

      return interaction.reply({
        content:
          'Your custom booster role has been removed.',
        ephemeral: true,
      });

    }

    // ========================================================
    // /br rename
    // ========================================================

    if (subcommand === 'rename') {

      const role =
        getCustomRole(interaction.member);

      if (!role) {

        return interaction.reply({
          content:
            'You do not have a custom booster role yet. Use `/br set` first.',
          ephemeral: true,
        });

      }

      const newName =
        interaction.options.getString('name');

      await role.setName(
        newName,
        'Booster renamed their custom role'
      );

      return interaction.reply({
        content:
          `Your custom role has been renamed to **${newName}**.`,
        ephemeral: true,
      });

    }

    // ========================================================
    // /br list
    // ========================================================

    if (subcommand === 'list') {

      if (!isStaff(interaction)) {

        return interaction.reply({
          content:
            'Only staff and the server owner can view the booster role list.',
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
            'The custom booster role parent role could not be found.',
          ephemeral: true,
        });

      }

      const customRoles =
        interaction.guild.roles.cache.filter(
          role =>
            role.position < parentRole.position &&
            role.managed === false
        );

      if (customRoles.size === 0) {

        return interaction.reply({
          content:
            'There are currently no custom booster roles.',
          ephemeral: true,
        });

      }

      const roleList =
        customRoles
          .map(role => `• <@&${role.id}>`)
          .join('\n');

      return interaction.reply({
        content:
          `## Custom Booster Roles\n\n${roleList}`,
        ephemeral: true,
      });

    }

    // ========================================================
    // /br remove-user
    // ========================================================

    if (subcommand === 'remove-user') {

      if (!isStaff(interaction)) {

        return interaction.reply({
          content:
            'Only staff and the server owner can remove another member\'s custom role.',
          ephemeral: true,
        });

      }

      const targetUser =
        interaction.options.getUser('user');

      const targetMember =
        await interaction.guild.members.fetch(
          targetUser.id
        );

      const role =
        getCustomRole(targetMember);

      if (!role) {

        return interaction.reply({
          content:
            `${targetUser} does not have a custom booster role.`,
          ephemeral: true,
        });

      }

      await targetMember.roles.remove(
        role,
        `Custom booster role removed by ${interaction.user.tag}`
      );

      await role.delete(
        `Custom booster role removed by ${interaction.user.tag}`
      );

      return interaction.reply({
        content:
          `Removed ${targetUser}'s custom booster role.`,
        ephemeral: true,
      });

    }

  },

};
