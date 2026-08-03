import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from "discord.js";

const JAIL_ROLE_ID = "1532199532916375773";

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
                .setRequired(true)
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageRoles
        ),


    category: "Moderation",



    async execute(interaction) {

        const target =
            interaction.options.getMember("user");


        const reason =
            interaction.options.getString("reason");



        if (!target) {

            return interaction.reply({
                content:
                "I could not find that member.",
                ephemeral: true
            });

        }



        if (target.id === interaction.user.id) {

            return interaction.reply({
                content:
                "You cannot jail yourself.",
                ephemeral: true
            });

        }



        const jailRole =
            interaction.guild.roles.cache.get(
                JAIL_ROLE_ID
            );



        if (!jailRole) {

            return interaction.reply({
                content:
                "The Jail role does not exist.",
                ephemeral: true
            });

        }



        // Check bot hierarchy

        if (
            target.roles.highest.position >=
            interaction.guild.members.me.roles.highest.position
        ) {

            return interaction.reply({
                content:
                "I cannot jail this member because their role is higher than mine.",
                ephemeral: true
            });

        }



        if (
            target.roles.cache.has(JAIL_ROLE_ID)
        ) {

            return interaction.reply({
                content:
                "That member is already jailed.",
                ephemeral: true
            });

        }



        await target.roles.add(
            jailRole,
            `Jailed by ${interaction.user.tag}: ${reason}`
        );




        // DM MEMBER

        const dmEmbed =
        new EmbedBuilder()

        .setTitle("You have been jailed")

        .setDescription(
`
You have been jailed in **${interaction.guild.name}**.

**Staff Member:**
${interaction.user}

**Reason:**
${reason}
`
        )

        .setColor("#8B0000")

        .setTimestamp();



        await target.send({
            embeds:[
                dmEmbed
            ]
        }).catch(() => {});





        // LOG MESSAGE

        const logEmbed =
        new EmbedBuilder()

        .setTitle("Member Jailed")

        .setDescription(
`
**Member:**
${target.user.tag}

**User ID:**
${target.id}

**Jailed By:**
${interaction.user.tag}

**Reason:**
${reason}
`
        )

        .setColor("#8B0000")

        .setTimestamp();



        // tries to find your log channel
        const logChannel =
        interaction.guild.channels.cache.find(
            channel =>
            channel.name.includes("log") &&
            channel.isTextBased()
        );


        if (logChannel) {

            await logChannel.send({
                embeds:[
                    logEmbed
                ]
            });

        }




        return interaction.reply({

            embeds:[

                new EmbedBuilder()

                .setTitle("Member Jailed")

                .setDescription(
`
${target.user} has been jailed.

**Reason:**
${reason}
`
                )

                .setColor("#8B0000")

                .setTimestamp()

            ]

        });

    }

};
