import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user to ban")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the ban"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    category: "moderation",

    async execute(interaction, config, client) {
        // your current slash code
    },

    prefixExecute: async (message, args, client) => {
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply("Please mention a user to ban.");
        }

        const reason = args.slice(1).join(" ") || "No reason provided";

        const result = await ModerationService.banUser({
            guild: message.guild,
            user,
            moderator: message.member,
            reason,
        });

        await message.reply({
            embeds: [
                successEmbed(
                    `**Banned** ${user.tag}`,
                    `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`,
                ),
            ],
        });
    },
};
