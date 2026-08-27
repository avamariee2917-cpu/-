import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// CONFIGURATION
// ============================================================

const OWNER_ID = '1531440557954437273';

const STAFF_ROLE_ID = '1532221464839848016';

const BOOSTER_ROLE_IDS = new Set([
  '1532269323584802836',
  '1533675708193177700',
]);

const CUSTOM_ROLE_PARENT_ID = '1531881126854004816';

// ============================================================
// FILE PATH
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY = path.join(__dirname, '../../data');
const BOOSTER_ROLES_FILE = path.join(
  DATA_DIRECTORY,
  'boosterRoles.json'
);

// ============================================================
// FILE HELPERS
// ============================================================

async function ensureDataFile() {
  await fs.mkdir(DATA_DIRECTORY, {
    recursive: true,
  });

  try {
    await fs.access(BOOSTER_ROLES_FILE);
  } catch {
    await fs.writeFile(
      BOOSTER_ROLES_FILE,
      JSON.stringify({}, null, 2),
      'utf8'
    );
  }
}

async function loadBoosterRoles() {
  await ensureDataFile();

  try {
    const raw = await fs.readFile(
      BOOSTER_ROLES_FILE,
      'utf8'
    );

    if (!raw.trim()) {
      return {};
    }

    const data = JSON.parse(raw);

    if (
      typeof data !== 'object' ||
      data === null ||
      Array.isArray(data)
    ) {
      return {};
    }

    return data;
  } catch (error) {
    console.error(
      'Could not load boosterRoles.json:',
      error
    );

    return {};
  }
}

async function saveBoosterRoles(data) {
  await ensureDataFile();

  await fs.writeFile(
    BOOSTER_ROLES_FILE,
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

function isOwner(interaction) {
  return interaction.user.id === OWNER_ID;
}

function isStaff(interaction) {
  return interaction.member?.roles?.cache?.has(
    STAFF_ROLE_ID
  );
}

function isStaffOrOwner(interaction) {
  return (
    isOwner(interaction) ||
    isStaff(interaction)
  );
}

function isBooster(member) {
  if (!member) {
    return false;
  }

  return BOOSTER_ROLE_IDS.has(
    [...member.roles.cache.keys()].find(roleId =>
      BOOSTER_ROLE_IDS.has(roleId)
    )
  );
}

// ============================================================
// COLOR VALIDATION
// ============================================================

function normalizeColor(color) {
  if (!color) {
    return null;
  }

  let normalized = color.trim();

  if (!normalized.startsWith('#')) {
    normalized = `#${normalized}`;
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

// ============================================================
// COMMAND
// ============================================================

export default {

  data: new SlashCommandBuilder()

    .setName('br')

    .setDescription(
      'Manage your custom booster role.'
    )

    // ========================================================
    // SET
    // ========================================================

    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription(
          'Create your custom booster role.'
        )
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription(
              'The name of your custom role.'
            )
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription(
              'Hex color, such as #8B0000.'
            )
            .setRequired(true)
            .setMaxLength(7)
        )
    )

    // ========================================================
    // RENAME
    // ========================================================

    .addSubcommand(subcommand =>
      subcommand
        .setName('rename')
        .setDescription(
          'Rename your existing custom booster role.'
        )
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription(
              'The new role name.'
            )
            .setRequired(true)
            .setMaxLength(100)
        )
    )

    // ========================================================
    // REMOVE
    // ========================================================

    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription(
          'Remove your custom booster role.'
        )
    )

    // ========================================================
    // LIST
    // ========================================================

    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription(
          'View all custom booster roles.'
        )
    ),

  // ==========================================================
  // EXECUTE
  // ==========================================================

  async execute(interaction) {

    const subcommand =
      interaction.options.getSubcommand();

    // ========================================================
    // LIST PERMISSION
    // ========================================================

    if (subcommand === 'list') {

      if (!isStaffOrOwner(interaction)) {

        return interaction.reply({
          content:
            'You do not have permission to use this command.',
          ephemeral: true,
        });

      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        const data =
          await loadBoosterRoles();

        const entries =
          Object.entries(data);

        if (entries.length === 0) {

          return interaction.editReply(
            'There are currently no custom booster roles.'
          );

        }

        const lines = [];

        const buttons = [];

        for (
          const [userId, roleId]
          of entries
        ) {

          const role =
            interaction.guild.roles.cache.get(
              roleId
            );

          const member =
            interaction.guild.members.cache.get(
              userId
            );

          if (!role) {
            continue;
          }

          const username =
            member?.user?.tag ||
            `<@${userId}>`;

          lines.push(
            `**${username}** → ${role}`
          );

          buttons.push(
            new ButtonBuilder()
              .setCustomId(
                `br_remove:${userId}:${roleId}`
              )
              .setLabel(
                `Remove ${member?.displayName || 'Role'}`
              )
              .setStyle(
                ButtonStyle.Danger
              )
          );

        }

        if (lines.length === 0) {

          return interaction.editReply(
            'No valid custom booster roles were found.'
          );

        }

        const embed =
          new EmbedBuilder()
            .setTitle(
              'Custom Booster Roles'
            )
            .setDescription(
              lines.join('\n\n')
            )
            .setFooter({
              text:
                'Only staff and the server owner can remove these roles.'
            });

        const components = [];

        // Discord allows a maximum of 5 buttons
        // per action row.

        for (
          let i = 0;
          i < buttons.length;
          i += 5
        ) {

          components.push(
            new ActionRowBuilder()
              .addComponents(
                buttons.slice(
                  i,
                  i + 5
                )
              )
          );

        }

        return interaction.editReply({
          embeds: [embed],
          components,
        });

      } catch (error) {

        console.error(
          'BR list error:',
          error
        );

        return interaction.editReply(
          'I could not load the custom booster roles.'
        );

      }

    }

    // ========================================================
    // BOOSTER PERMISSIONS
    // ========================================================

    if (!isBooster(interaction.member)) {

      return interaction.reply({
        content:
          'You must currently be boosting the server to use this command.',
        ephemeral: true,
      });

    }

    // ========================================================
    // LOAD DATA
    // ========================================================

    const data =
      await loadBoosterRoles();

    const userId =
      interaction.user.id;

    const existingRoleId =
      data[userId];

    // ========================================================
    // SET
    // ========================================================

    if (subcommand === 'set') {

      if (existingRoleId) {

        const existingRole =
          interaction.guild.roles.cache.get(
            existingRoleId
          );

        if (existingRole) {

          return interaction.reply({
            content:
              `You already have a custom booster role: ${existingRole}\n\nUse \`/br rename\` to rename it or \`/br remove\` to delete it.`,
            ephemeral: true,
          });

        }

        delete data[userId];

        await saveBoosterRoles(data);

      }

      const name =
        interaction.options.getString(
          'name'
        );

      const colorInput =
        interaction.options.getString(
          'color'
        );

      const color =
        normalizeColor(
          colorInput
        );

      if (!color) {

        return interaction.reply({
          content:
            'That is not a valid hex color. Use something like `#8B0000`.',
          ephemeral: true,
        });

      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        const botMember =
          interaction.guild.members.me ||
          await interaction.guild.members.fetchMe();

        if (!botMember) {

          return interaction.editReply(
            'I could not find my bot member.'
          );

        }

        if (
          !botMember.permissions.has(
            PermissionFlagsBits.ManageRoles
          )
        ) {

          return interaction.editReply(
            'I need the **Manage Roles** permission to create custom booster roles.'
          );

        }

        const parentRole =
          interaction.guild.roles.cache.get(
            CUSTOM_ROLE_PARENT_ID
          );

        if (!parentRole) {

          return interaction.editReply(
            `I could not find the custom-role parent role (${CUSTOM_ROLE_PARENT_ID}).`
          );

        }

        if (
          parentRole.position >=
          botMember.roles.highest.position
        ) {

          return interaction.editReply(
            'I cannot create custom roles below that role because my highest role is not above it.\n\nMove my bot role above the custom-role parent role in **Server Settings → Roles**.'
          );

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
            parentRole.position - 1
          );

        } catch (positionError) {

          console.warn(
            'Could not position booster role:',
            positionError
          );

        }

        await interaction.member.roles.add(
          role,
          'Custom booster role created'
        );

        data[userId] =
          role.id;

        await saveBoosterRoles(
          data
        );

        return interaction.editReply(
          `Your custom booster role has been created.\n\n**Role:** ${role}\n**Color:** \`${color}\`\n\nUse \`/br rename\` whenever you want to change its name.`
        );

      } catch (error) {

        console.error(
          'BR set error:',
          error
        );

        return interaction.editReply(
          'I could not create your custom booster role. Check my **Manage Roles** permission and role hierarchy.'
        );

      }

    }

    // ========================================================
    // RENAME
    // ========================================================

    if (subcommand === 'rename') {

      if (!existingRoleId) {

        return interaction.reply({
          content:
            'You do not have a custom booster role yet. Use `/br set` first.',
          ephemeral: true,
        });

      }

      const role =
        interaction.guild.roles.cache.get(
          existingRoleId
        );

      if (!role) {

        delete data[userId];

        await saveBoosterRoles(
          data
        );

        return interaction.reply({
          content:
            'Your previous custom booster role no longer exists. Use `/br set` to create a new one.',
          ephemeral: true,
        });

      }

      const newName =
        interaction.options.getString(
          'name'
        );

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        const botMember =
          interaction.guild.members.me ||
          await interaction.guild.members.fetchMe();

        if (
          role.position >=
          botMember.roles.highest.position
        ) {

          return interaction.editReply(
            'I cannot rename that role because it is above or equal to my highest role.'
          );

        }

        await role.setName(
          newName,
          'Custom booster role renamed'
        );

        return interaction.editReply(
          `Your custom booster role has been renamed to **${newName}**.`
        );

      } catch (error) {

        console.error(
          'BR rename error:',
          error
        );

        return interaction.editReply(
          'I could not rename your custom booster role.'
        );

      }

    }

    // ========================================================
    // REMOVE
    // ========================================================

    if (subcommand === 'remove') {

      if (!existingRoleId) {

        return interaction.reply({
          content:
            'You do not have a custom booster role.',
          ephemeral: true,
        });

      }

      const role =
        interaction.guild.roles.cache.get(
          existingRoleId
        );

      delete data[userId];

      await saveBoosterRoles(
        data
      );

      if (!role) {

        return interaction.reply({
          content:
            'Your custom booster role was already deleted.',
          ephemeral: true,
        });

      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {

        const botMember =
          interaction.guild.members.me ||
          await interaction.guild.members.fetchMe();

        if (
          role.position >=
          botMember.roles.highest.position
        ) {

          return interaction.editReply(
            'I found your role, but I cannot delete it because it is above or equal to my highest role.'
          );

        }

        await role.delete(
          'Booster removed their custom role'
        );

        return interaction.editReply(
          'Your custom booster role has been removed.'
        );

      } catch (error) {

        console.error(
          'BR remove error:',
          error
        );

        return interaction.editReply(
          'I could not delete your custom booster role.'
        );

      }

    }

  },

};
