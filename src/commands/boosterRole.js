import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

import {
  getBoosterRole,
  saveBoosterRole,
  updateBoosterRole,
  removeBoosterRoleRecord,
  cleanupMissingBoosterRoles,
} from '../utils/boosterRoles.js';

const OWNER_ID = '1531440557954437273';

const STAFF_ROLE_ID = '1532221464839848016';

const BOOSTER_ROLE_IDS = [
  '1532269323584802836',
  '1533675708193177700',
];

const CUSTOM_ROLE_PARENT_ID = '1531881126854004816';

function isOwner(interaction) {
  return (
    interaction.user.id === OWNER_ID ||
    interaction.guild?.ownerId === interaction.user.id
  );
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

function canManageBoosterSystem(interaction) {
  return isOwner(interaction) || isStaff(interaction);
}

export default {
  data: new SlashCommandBuilder()
    .setName('br')
    .setDescription('Manage custom booster roles.')

    // /br set
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

    // /br remove
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your custom booster role.')
    )

    // /br rename
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

    // /br list
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all custom booster roles.')
    )

    // /br remove-user
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

  async execute(interaction, guildConfig, client) {
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guild) {
      return interaction.reply({
        content:
          'This command can only be used inside a server.',
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
            'You must be a server booster to create a custom booster role.',
          ephemeral: true,
        });
      }

      const existing =
        await getBoosterRole(
          client,
          interaction.guild.id,
          interaction.user.id
        );

      if (existing) {
        const existingRole =
          interaction.guild.roles.cache.get(
            existing.roleId
          );

        if (existingRole) {
          return interaction.reply({
            content:
              `You already have a custom role: <@&${existingRole.id}>`,
            ephemeral: true,
          });
        }

        await removeBoosterRoleRecord(
          client,
          interaction.guild.id,
          interaction.user.id
        );
      }

      const name =
        interaction.options.getString('name');

      const color =
        interaction.options.getString('color');

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
          content:
            'Invalid color. Use a hex color such as `#8B0000`.',
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
            'I need the **Manage Roles** permission to create custom booster roles.',
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

      if (
        parentRole.position >=
        botMember.roles.highest.position
      ) {
        return interaction.reply({
          content:
            'I cannot manage roles underneath the configured parent role. Please move my highest role above the parent role.',
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

      try {
        await role.setPosition(
          Math.max(
            0,
            parentRole.position - 1
          ),
          `Positioning custom booster role for ${interaction.user.tag}`
        );
      } catch (error) {
        await role.delete(
          'Could not position custom booster role'
        ).catch(() => {});

        return interaction.reply({
          content:
            'I created the role but could not place it underneath the custom-role parent role. The role was removed.',
          ephemeral: true,
        });
      }

      try {
        await interaction.member.roles.add(
          role,
          'Custom booster role created'
        );
      } catch (error) {
        await role.delete(
          'Could not assign custom booster role'
        ).catch(() => {});

        return interaction.reply({
          content:
            'I could not assign the custom booster role to you.',
          ephemeral: true,
        });
      }

      const saved =
        await saveBoosterRole(
          client,
          interaction.guild.id,
          interaction.user.id,
          role.id,
          role.name
        );

      if (!saved) {
        await interaction.member.roles.remove(
          role,
          'Could not save custom booster role'
        ).catch(() => {});

        await role.delete(
          'Could not save custom booster role'
        ).catch(() => {});

        return interaction.reply({
          content:
            'Your role could not be saved to the database, so the role was removed.',
          ephemeral: true,
        });
      }

      return interaction.reply({
        content:
          `${interaction.user} created a custom booster role: <@&${role.id}>`,
      });
    }

    // ========================================================
    // /br remove
    // ========================================================

    if (subcommand === 'remove') {
      if (!isBooster(interaction)) {
        return interaction.reply({
          content:
            'You must be a server booster to use this command.',
          ephemeral: true,
        });
      }

      const record =
        await getBoosterRole(
          client,
          interaction.guild.id,
          interaction.user.id
        );

      if (!record) {
        return interaction.reply({
          content:
            'You do not have a custom booster role.',
          ephemeral: true,
        });
      }

      const role =
        interaction.guild.roles.cache.get(
          record.roleId
        );

      await removeBoosterRoleRecord(
        client,
        interaction.guild.id,
        interaction.user.id
      );

      if (role) {
        await interaction.member.roles.remove(
          role,
          'Booster removed their custom role'
        ).catch(() => {});

        await role.delete(
          'Booster removed their custom role'
        ).catch(() => {});
      }

      return interaction.reply({
        content:
          `${interaction.user} removed their custom booster role.`,
      });
    }

    // ========================================================
    // /br rename
    // ========================================================

    if (subcommand === 'rename') {
      if (!isBooster(interaction)) {
        return interaction.reply({
          content:
            'You must be a server booster to use this command.',
          ephemeral: true,
        });
      }

      const record =
        await getBoosterRole(
          client,
          interaction.guild.id,
          interaction.user.id
        );

      if (!record) {
        return interaction.reply({
          content:
            'You do not have a custom booster role yet. Use `/br set` first.',
          ephemeral: true,
        });
      }

      const role =
        interaction.guild.roles.cache.get(
          record.roleId
        );

      if (!role) {
        await removeBoosterRoleRecord(
          client,
          interaction.guild.id,
          interaction.user.id
        );

        return interaction.reply({
          content:
            'Your custom role no longer exists. Use `/br set` to create a new one.',
          ephemeral: true,
        });
      }

      const newName =
        interaction.options.getString('name');

      const oldName =
        role.name;

      await role.setName(
        newName,
        'Booster renamed their custom role'
      );

      await updateBoosterRole(
        client,
        interaction.guild.id,
        interaction.user.id,
        {
          roleName: newName,
        }
      );

      return interaction.reply({
        content:
          `${interaction.user} renamed their custom booster role from **${oldName}** to **${newName}**.`,
      });
    }

    // ========================================================
    // /br list
    // ========================================================

    if (subcommand === 'list') {
      if (!isStaff(interaction)) {
        return interaction.reply({
          content:
            'Only staff and the server owner can view custom booster roles.',
          ephemeral: true,
        });
      }

      const records =
        await cleanupMissingBoosterRoles(
          client,
          interaction.guild.id,
          interaction.guild
        );

      const entries =
        Object.entries(records);

      if (entries.length === 0) {
        return interaction.reply({
          content:
            'There are currently no custom booster roles.',
        });
      }

      const lines = [];

      for (
        const [userId, record]
        of entries.slice(0, 25)
      ) {
        const role =
          interaction.guild.roles.cache.get(
            record.roleId
          );

        if (!role) {
          continue;
        }

        const member =
          interaction.guild.members.cache.get(
            userId
          ) ||
          await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

        const userLabel =
          member?.user
            ? `${member.user.tag}`
            : `<@${userId}>`;

        lines.push(
          `• <@&${role.id}> — ${userLabel}`
        );
      }

      if (lines.length === 0) {
        return interaction.reply({
          content:
            'There are currently no valid custom booster roles.',
        });
      }

      // PUBLIC LIST — NO BUTTON
      return interaction.reply({
        content:
          `## ✦ Custom Booster Roles\n\n${lines.join('\n')}`,
      });
    }

    // ========================================================
    // /br remove-user
    // ========================================================

    if (subcommand === 'remove-user') {
      if (!canManageBoosterSystem(interaction)) {
        return interaction.reply({
          content:
            'Only staff and the server owner can remove another member\'s custom booster role.',
          ephemeral: true,
        });
      }

      const targetUser =
        interaction.options.getUser('user');

      const record =
        await getBoosterRole(
          client,
          interaction.guild.id,
          targetUser.id
        );

      if (!record) {
        return interaction.reply({
          content:
            `${targetUser} does not have a custom booster role.`,
          ephemeral: true,
        });
      }

      const role =
        interaction.guild.roles.cache.get(
          record.roleId
        );

      const targetMember =
        await interaction.guild.members
          .fetch(targetUser.id)
          .catch(() => null);

      await removeBoosterRoleRecord(
        client,
        interaction.guild.id,
        targetUser.id
      );

      if (targetMember && role) {
        await targetMember.roles.remove(
          role,
          `Custom booster role removed by ${interaction.user.tag}`
        ).catch(() => {});
      }

      if (role) {
        await role.delete(
          `Custom booster role removed by ${interaction.user.tag}`
        ).catch(() => {});
      }

      // PUBLIC SUCCESS MESSAGE
      return interaction.reply({
        content:
          `Removed ${targetUser}'s custom booster role.`,
      });
    }
  },
};
