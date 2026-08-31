import { SlashCommandBuilder } from "discord.js";

const CUDDLE_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543873015010431066/7027115D-66A8-4017-B03C-953962FEB41E.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543873017757696071/79BAE3B8-41E9-4E4F-8A88-AEFADAFBE89B.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543873030407594024/D2F4A3FE-1459-4FE6-917A-C430DAF478B9.gif"
];

function randomGif() {
    return CUDDLE_GIFS[
        Math.floor(Math.random() * CUDDLE_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("cuddle")
        .setDescription("Cuddle someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to cuddle")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to cuddle.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't cuddle yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't cuddle a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> cuddled <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
