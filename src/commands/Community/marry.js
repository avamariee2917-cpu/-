import { SlashCommandBuilder } from "discord.js";

const MARRY_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871534324654121/41D4FFA1-B3C6-4466-BACD-5988511C4184.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871573683871754/0D46238A-A6C9-414C-8044-610843FCB08A.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871583041495120/27561A40-C35C-4FE7-A538-C676F712D6B6.gif"
];

function randomGif() {
    return MARRY_GIFS[
        Math.floor(Math.random() * MARRY_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("marry")
        .setDescription("Marry someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to marry")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to marry.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't marry yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't marry a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> married <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
