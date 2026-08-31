import { SlashCommandBuilder } from "discord.js";

const BONK_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543872402491056208/BCE84B65-9A0B-454B-9E8E-674E7C7439CE.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543872405389316126/D7048DB1-31B5-4857-A4E0-8D5CDBC74472.gif"
];

function randomGif() {
    return BONK_GIFS[
        Math.floor(Math.random() * BONK_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("bonk")
        .setDescription("Bonk someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to bonk")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to bonk.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't bonk yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't bonk a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> bonked <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
