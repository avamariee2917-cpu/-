import { SlashCommandBuilder } from "discord.js";
import { successEmbed } from "../../utils/embeds.js";

const BOOSTER_ROLE_IDS = [
    "1532269323584802836", // 1 booster
    "1533675708193177700"  // 2 booster
];

// Temporary storage
// Replace with database later
const boosterRoleOwners = new Map();


export default {

    data: new SlashCommandBuilder()
        .setName("br")
        .setDescription("Create and manage your booster role")

        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Role name")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("color")
                .setDescription("Role color (#527357)")
                .setRequired(false)
        ),


    category: "booster",


    async execute(interaction) {

        const name = interaction.options.getString("name");
        const color = interaction.options.getString("color") || "#000000";

        await createBoosterRole(
            interaction,
            name,
            color
        );

    },


    // Prefix:
    // br veil #527357

    async prefixExecute(message, args) {

        const name = args[0];
        const color = args[1] || "#000000";


        if (!name) {

            return message.reply(
                "Usage: `br <name> <color>`\nExample: `br veil #527357`"
            );

        }


        await createBoosterRole(
            message,
            name,
            color
        );

    }

};



async function createBoosterRole(context, name, color) {

    const member =
        context.member;



    const isBooster =
        member.roles.cache.some(role =>
            BOOSTER_ROLE_IDS.includes(role.id)
        );



    if (!isBooster) {

        return context.reply({

            content:
            "You must be boosting this server to create a custom role.",

            ephemeral: true

        });

    }



    if (boosterRoleOwners.has(member.id)) {

        return context.reply({

            content:
            "You already have a custom booster role. You can only have one.",

            ephemeral: true

        });

    }



    if (!/^#[0-9A-F]{6}$/i.test(color)) {

        return context.reply({

            content:
            "Invalid color. Example: `#527357`",

            ephemeral:true

        });

    }



    const role =
        await context.guild.roles.create({

            name:name,

            color:color,

            reason:
            `Booster role created by ${member.user.tag}`

        });



    // Move role below bot's highest role

    const botHighest =
        context.guild.members.me.roles.highest.position;


    await role.setPosition(botHighest - 1);



    await member.roles.add(role);



    boosterRoleOwners.set(
        member.id,
        role.id
    );



    return context.reply({

        embeds:[
            successEmbed(
                "Booster Role Created",
                `Created **${name}**\nColor: **${color}**`
            )
        ]

    });

}
