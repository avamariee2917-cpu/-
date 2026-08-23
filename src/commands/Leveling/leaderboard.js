import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEVELING_FILE = path.join(
  __dirname,
  '../../data/leveling.json'
);

function loadLevelingData() {
  try {
    if (!fs.existsSync(LEVELING_FILE)) {
      return {};
    }

    const rawData = fs.readFileSync(
      LEVELING_FILE,
      'utf8'
    );

    if (!rawData.trim()) {
      return {};
    }

    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to load leveling data:', error);
    return {};
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leveling leaderboard.'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
    }

    const levelingData = loadLevelingData();

    const guildData =
      levelingData[interaction.guild.id] || {};

    const users = Object.entries(guildData)
      .filter(([userId, data]) => {
        return (
          userId &&
          data &&
          typeof data.xp === 'number'
        );
      })
      .sort(([, userA], [, userB]) => {
        return (
          (userB.xp || 0) -
          (userA.xp || 0)
        );
      });

    if (users.length === 0) {
      return interaction.reply({
        content:
          'There are currently no users on the leveling leaderboard.',
        ephemeral: false
      });
    }

    const topUsers = users.slice(0, 10);

    const lines = [];

    for (let i = 0; i < topUsers.length; i++) {
      const [userId, data] = topUsers[i];

      const level = data.level || 1;
      const xp = data.xp || 0;

      const user = await interaction.client.users
        .fetch(userId)
        .catch(() => null);

      const username =
        user?.username ||
        `Unknown User`;

      lines.push(
        `**${i + 1}.** ${username} — Level **${level}** — **${xp} XP**`
      );
    }

    return interaction.reply({
      content:
        `**Leveling Leaderboard**\n\n${lines.join('\n')}`,
      ephemeral: false
    });
  }
};
