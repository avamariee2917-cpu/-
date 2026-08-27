import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('br')
    .setDescription('Manage your custom booster role.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Create your custom booster role.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your custom booster role.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rename')
        .setDescription('Rename your custom booster role.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View custom booster roles.')
    ),

  async execute(interaction) {
    const subcommand =
      interaction.options.getSubcommand();

    await interaction.reply({
      content: `You used \`/br ${subcommand}\`.`,
      ephemeral: true,
    });
  },
};
