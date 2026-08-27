import {
  PermissionFlagsBits,
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

  await fs.mkdir(
    DATA_DIRECTORY,
    {
      recursive: true,
    }
  );

  try {

    await fs.access(
      BOOSTER_ROLES_FILE
    );

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

    const raw =
      await fs.readFile(
        BOOSTER_ROLES_FILE,
        'utf8'
      );

    if (!raw.trim()) {
      return {};
    }

    const data =
      JSON.parse(raw);

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

async function saveBoosterRoles(
  data
) {

  await ensureDataFile();

  await fs.writeFile(
    BOOSTER_ROLES_FILE,
    JSON.stringify(data, null, 2),
    'utf8'
  );

}

// ============================================================
// BOOST CHECK
// ============================================================

function isBooster(member) {

  if (!member) {
    return false;
  }

  return member.roles.cache.some(
    role =>
      BOOSTER_ROLE_IDS.has(
        role.id
      )
  );

}

// ============================================================
// EVENT
// ============================================================

export default {

  name: 'guildMemberUpdate',

  once: false,

  async execute(
    oldMember,
    newMember,
    client
  ) {

    try {

      // ======================================================
      // ONLY CARE ABOUT BOOST STATUS CHANGES
      // ======================================================

      const wasBooster =
        isBooster(oldMember);

      const isCurrentlyBooster =
        isBooster(newMember);

      // Someone is still boosting.
      if (
        wasBooster &&
        isCurrentlyBooster
      ) {

        return;

      }

      // Someone wasn't boosting before
      // and still isn't.
      if (
        !wasBooster &&
        !isCurrentlyBooster
      ) {

        return;

      }

      // ======================================================
      // ONLY CLEAN UP WHEN BOOSTING ENDS
      // ======================================================

      if (
        !wasBooster ||
        isCurrentlyBooster
      ) {

        return;

      }

      // ======================================================
      // LOAD ROLE DATA
      // ======================================================

      const data =
        await loadBoosterRoles();

      const userId =
        newMember.id;

      const roleId =
        data[userId];

      if (!roleId) {

        return;

      }

      // ======================================================
      // DELETE RECORD FIRST
      // ======================================================

      delete data[userId];

      await saveBoosterRoles(
        data
      );

      // ======================================================
      // FIND ROLE
      // ======================================================

      const role =
        newMember.guild.roles.cache.get(
          roleId
        );

      if (!role) {

        console.log(
          `Custom booster role ${roleId} for ${newMember.user.tag} no longer exists.`
        );

        return;

      }

      // ======================================================
      // BOT MEMBER
      // ======================================================

      const botMember =
        newMember.guild.members.me ||
        await newMember.guild.members.fetchMe();

      if (!botMember) {

        console.warn(
          'Could not find bot member while cleaning booster role.'
        );

        return;

      }

      // ======================================================
      // MANAGE ROLES CHECK
      // ======================================================

      if (
        !botMember.permissions.has(
          PermissionFlagsBits.ManageRoles
        )
      ) {

        console.warn(
          'Cannot delete custom booster role: bot lacks Manage Roles permission.'
        );

        return;

      }

      // ======================================================
      // HIERARCHY CHECK
      // ======================================================

      if (
        role.position >=
        botMember.roles.highest.position
      ) {

        console.warn(
          `Cannot delete custom booster role "${role.name}" because it is above or equal to the bot's highest role.`
        );

        return;

      }

      // ======================================================
      // DELETE ROLE
      // ======================================================

      try {

        await role.delete(
          'Member stopped boosting the server'
        );

        console.log(
          `Deleted custom booster role "${role.name}" because ${newMember.user.tag} stopped boosting.`
        );

      } catch (error) {

        console.error(
          `Could not delete custom booster role ${roleId}:`,
          error
        );

      }

    } catch (error) {

      console.error(
        'Booster role cleanup error:',
        error
      );

    }

  },

};
