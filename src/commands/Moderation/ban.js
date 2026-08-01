import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

async function resolveUser(input, client) {
    // If someone uses @User
    const mentionMatch = input.match(/^<@!?(\d+)>$/);

    if (mentionMatch) {
        return await client.users.fetch(mentionMatch[1]).catch(() => null);
    }

    // If someone uses an ID
    if (/^\d{17,20}$/.test(input)) {
        return await client.users.fetch(input).catch(() => null);
    }

    // If someone uses a username
    const found = client.users.cache.find(
        user => user.username.toLowerCase() === input.toLowerCase()
    );

    return found || null;
}

export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")
        .addStringOption((option) =>
    option
        .setName("user")
        .setDescription("User mention, ID, or username")
        .setRequired(true),
)
        
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the ban"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    category: "moderation",

        async execute(interaction, config, client) {

        const input = interaction.options.getString("user");

        const user = await resolveUser(input, client);

        if (!user) {
            return interaction.reply({
                content: "I could not find that user.",
                ephemeral: true
            });
        }

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided";
            
console.log("INPUT:", input);
console.log("USER:", user);
console.log("USER ID:", user?.id);

        const result = await ModerationService.banUser({
            guild: interaction.guild,
            user,
            moderator: interaction.member,
            reason,
        });


        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    `**Banned** ${user.tag}`,
                    `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`,
                ),
            ],
        });
    },


    prefixExecute: async (interaction, guildConfig, client) => {

    const input = interaction.options.getString("user");

    const user = await resolveUser(input, client);

    if (!user) {
        return interaction.reply({
            content: "I could not find that user.",
            ephemeral: true
        });
    }

    const reason =
        interaction.options.getString("reason") ||
        "No reason provided";


    const result = await ModerationService.banUser({
        guild: interaction.guild,
        user,
        moderator: interaction.member,
        reason,
    });


    await interaction.reply({
        embeds: [
            successEmbed(
                `**Banned** ${user.tag}`,
                `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`,
            ),
        ],
    });
},
