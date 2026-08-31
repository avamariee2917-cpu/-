import { SlashCommandBuilder } from "discord.js";

const HUG_GIFS = [
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543869586741403711/6E2BF775-E471-42E2-A798-B619B5ECC448.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543869588675100712/5DF2C8DF-5C90-4889-8629-2C1A63BBDF3A.gif",
    "https://cdn.discordapp.com/attachments/1531527600718221363/1543869593716523048/4FD989AF-F318-4316-9733-3B66BAAA59AC.gif"
];

function randomGif() {
    return HUG_GIFS[
        Math.floor(Math.random() * HUG_GIFS.length)
    ];
}

export default {

    data: new SlashCommandBuilder()
        .setName("hug")
        .setDescription("Give someone a hug")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person you want to hug")
                .setRequired(true)
        ),

    category: "community",

    async execute(interaction) {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            return interaction.reply({
                content: "You need to choose someone to hug.",
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't hug yourself.",
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: "You can't hug a bot.",
                ephemeral: true
            });
        }

        const gif = randomGif();

        await interaction.reply({
            embeds: [
                {
                    color: 0x808080,
                    description:
                        `.⋆♱ <@${interaction.user.id}> hugged <@${target.id}>.`,
                    image: {
                        url: gif
                    }
                }
            ]
        });

    }

};
