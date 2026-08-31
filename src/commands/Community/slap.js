import { SlashCommandBuilder } from "discord.js";

const SLAP_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543870157393498122/480B6BC8-BEE7-46AB-85AE-79F5DE772D8D.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543870161969356850/2FA641C4-5B83-4E26-B238-ADF6CF08C896.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543870166226702406/CAF010F1-3199-407E-8ADF-F5D9EBF17323.gif"
];

function randomGif() {
    return SLAP_GIFS[
        Math.floor(Math.random() * SLAP_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("slap")
        .setDescription("Slap someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to slap")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to slap.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't slap yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't slap a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> slapped <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
