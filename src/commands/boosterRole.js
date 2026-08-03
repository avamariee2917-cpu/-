import { SlashCommandBuilder } from "discord.js";

const BOOSTER_ROLE_1 = "1532269323584802836"; // Boosted once
const BOOSTER_ROLE_2 = "1533675708193177700"; // Boosted twice

export default {
    data: new SlashCommandBuilder()
        .setName("br")
        .setDescription("Customize your booster role")

        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Rename your booster role")
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("color")
                .setDescription("Change role color (example: #527357)")
                .setRequired(false)
        ),

    category: "Community",

    async execute(interaction) {

        const member = interaction.member;


        // Check booster roles
        const isBooster =
            member.roles.cache.has(BOOSTER_ROLE_1) ||
            member.roles.cache.has(BOOSTER_ROLE_2);


        if (!isBooster) {
            return interaction.reply({
                content: "You must be a server booster to use this command.",
                ephemeral: true
            });
        }


        // Find existing booster role
        let boosterRole = interaction.guild.roles.cache.find(
            role => role.name === `✦ ${member.user.username}'s Role`
        );


        // Create role if they don't have one
        if (!boosterRole) {

            boosterRole = await interaction.guild.roles.create({
                name: `✦ ${member.user.username}'s Role`,
                color: "#000000",
                reason: "Booster custom role"
            });


            await member.roles.add(boosterRole);
        }


        const newName =
            interaction.options.getString("name");

        const newColor =
            interaction.options.getString("color");


        // Change name
        if (newName) {

            await boosterRole.setName(
                `✦ ${newName}`
            );

        }


        // Change color
        if (newColor) {

            if (!/^#[0-9A-F]{6}$/i.test(newColor)) {

                return interaction.reply({
                    content:
                    "Invalid color format. Use something like: #527357",
                    ephemeral: true
                });

            }


            await boosterRole.setColor(newColor);
        }



        await interaction.reply({
            content:
            `Your booster role has been updated.\n\n` +
            `Role: ${boosterRole}\n` +
            `${newName ? `Name: ${newName}\n` : ""}` +
            `${newColor ? `Color: ${newColor}` : ""}`,

            ephemeral: true
        });

    }
};
