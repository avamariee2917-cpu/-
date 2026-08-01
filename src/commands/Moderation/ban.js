import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';


export default {

    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")

        .addUserOption(option =>
            option
                .setName("target")
                .setDescription("The user to ban")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the ban")
                .setRequired(false)
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        ),


    category: "moderation",



    async execute(interaction, config, client) {

        const user =
            interaction.options.getUser("target");


        const reason =
            interaction.options.getString("reason")
            || "No reason provided";



        if (!user) {

            throw new TitanBotError(
                "Missing target user",
                ErrorTypes.USER_INPUT,
                "You must specify a user to ban."
            );

        }



        if (user.id === interaction.user.id) {

            throw new TitanBotError(
                "Cannot ban self",
                ErrorTypes.VALIDATION,
                "You cannot ban yourself."
            );

        }



        if (user.id === client.user.id) {

            throw new TitanBotError(
                "Cannot ban bot",
                ErrorTypes.VALIDATION,
                "You cannot ban the bot."
            );

        }



        const result =
            await ModerationService.banUser({

                guild: interaction.guild,

                user,

                moderator: interaction.member,

                reason,

            });



        await InteractionHelper.universalReply(
            interaction,
            {
                embeds: [
                    successEmbed(
                        `🔨 **Banned** ${user.tag}`,
                        `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`
                    )
                ]
            }
        );

    },



    prefixExecute: async (message, args, client) => {


        const input = args[0];


        if (!input) {

            return message.reply(
                "Please provide a user mention or ID."
            );

        }



        let user = null;


        const mention =
            input.match(/^<@!?(\d+)>$/);



        if (mention) {

            user =
                await client.users.fetch(
                    mention[1]
                ).catch(() => null);

        }



        if (!user && /^\d{17,20}$/.test(input)) {

            user =
                await client.users.fetch(
                    input
                ).catch(() => null);

        }



        if (!user) {

            return message.reply(
                "I could not find that user."
            );

        }



        const reason =
            args.slice(1).join(" ")
            || "No reason provided";



        const result =
            await ModerationService.banUser({

                guild: message.guild,

                user,

                moderator: message.member,

                reason,

            });



        await message.reply({

            embeds: [

                successEmbed(
                    `🔨 **Banned** ${user.tag}`,
                    `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`
                )

            ]

        });

    }

};
