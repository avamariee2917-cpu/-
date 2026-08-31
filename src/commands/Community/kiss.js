import { SlashCommandBuilder } from "discord.js";

const KISS_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871065405521930/C0879738-B4F6-437E-BB90-7DF8CCD5FFE5.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871075916713984/6E1A74D1-F7A0-4CD0-B0C6-1221537EDC01.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871085651697696/45175CC6-41EC-48A3-B180-7116CC810B7C.gif"
];

function randomGif() {
    return KISS_GIFS[
        Math.floor(Math.random() * KISS_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("kiss")
        .setDescription("Kiss someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to kiss")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to kiss.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't kiss yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't kiss a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> kissed <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
