import { SlashCommandBuilder } from "discord.js";

const HIGHFIVE_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543873362953109544/F904D79F-6731-4397-974E-528F13FCC56E.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543873368820809738/2F916F6E-E773-4408-BF68-7116C709EE49.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543873382909481062/EE3D7324-7041-4BD0-AB58-12BF33368F68.gif"
];

function randomGif() {
    return HIGHFIVE_GIFS[
        Math.floor(Math.random() * HIGHFIVE_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("highfive")
        .setDescription("Give someone a high five")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to high five")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to high five.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't high five yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't high five a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> high-fived <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
