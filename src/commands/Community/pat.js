import { SlashCommandBuilder } from "discord.js";

const PAT_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543872693139406988/A281225A-2767-4D38-A0CA-23450527E656.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543872695777628200/D7AF55FB-98C7-4602-BAC3-0DB462518746.gif"
];

function randomGif() {
    return PAT_GIFS[
        Math.floor(Math.random() * PAT_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("pat")
        .setDescription("Pat someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to pat")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to pat.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't pat yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't pat a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> patted <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
