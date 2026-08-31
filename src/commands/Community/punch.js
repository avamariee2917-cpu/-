import { SlashCommandBuilder } from "discord.js";

const PUNCH_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871942749069362/8C8E1741-B53F-4E20-A5A2-E6FCC47B6C02.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871965058568292/77D29613-38F7-4B99-9DD6-C39A34C361E9.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543871969877954591/EE0C31CC-70FC-4C0A-84F1-DF74BB8F5207.gif"
];

function randomGif() {
    return PUNCH_GIFS[
        Math.floor(Math.random() * PUNCH_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("punch")
        .setDescription("Punch someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to punch")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to punch.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't punch yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't punch a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> punched <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
