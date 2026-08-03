import { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    EmbedBuilder
} from "discord.js";

const JAIL_ROLE_ID = "1532199532916375773";
const LOG_CHANNEL_ID = "1533730276965089390";


export default {
    data: new SlashCommandBuilder()
        .setName("jail")
        .setDescription("Jail a member")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to jail")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the jail")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    category: "Moderation",


    async execute(interaction) {

        const target = interaction.options.getMember("user");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided";


        if (!target) {
            return interaction.reply({
                content: "I could not find that member.",
                ephemeral: true
            });
        }


        const jailRole = interaction.guild.roles.cache.get(
            JAIL_ROLE_ID
        );


        if (!jailRole) {
            return interaction.reply({
                content: "The jail role could not be found.",
                ephemeral: true
            });
        }


        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You cannot jail yourself.",
                ephemeral: true
            });
        }



        // DM the jailed member
        await target.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("You have been jailed")
                    .setDescription(
                        `You have been jailed in **${interaction.guild.name}**.\n\n` +
                        `**Staff Member:** ${interaction.user.tag}\n` +
                        `**Reason:** ${reason}`
                    )
                    .setColor("Red")
                    .setTimestamp()
            ]
        }).catch(() => {});



        // Remove roles
        const removableRoles = target.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .filter(role => !role.managed);


        await target.roles.remove(removableRoles)
            .catch(() => {});



        // Add jail role
        await target.roles.add(jailRole);



        // Reply to staff
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Member Jailed")
                    .setDescription(
                        `**Member:** ${target}\n` +
                        `**Reason:** ${reason}`
                    )
                    .setColor("Red")
                    .setTimestamp()
            ]
        });



        // Send log
        const logChannel = interaction.guild.channels.cache.get(
            LOG_CHANNEL_ID
        );


        if (logChannel) {

            await logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🔒 Member Jailed")
                        .setDescription(
                            `**Member:** ${target}\n` +
                            `**User ID:** ${target.id}\n\n` +
                            `**Jailed By:** ${interaction.user}\n` +
                            `**Staff ID:** ${interaction.user.id}\n\n` +
                            `**Reason:** ${reason}`
                        )
                        .setColor("Red")
                        .setTimestamp()
                ]
            });

        }

    }
};
