import { SlashCommandBuilder } from "discord.js";
import { successEmbed } from "../../utils/embeds.js";

const BOOSTER_ROLE_ID = "PUT_BOOSTER_ROLE_ID_HERE";

// Temporary storage
// Replace with database later
const boosterRoles = new Map();


export default {

    data: new SlashCommandBuilder()
        .setName("br")
        .setDescription("Create or manage your booster role")

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

        await createBoosterRole(
            interaction,
            interaction.options.getString("name"),
            interaction.options.getString("color")
        );

    },



    // PREFIX COMMAND
    prefixExecute: async (interaction) => {

        const args = interaction.options._hoistedOptions.map(
            option => option.value
        );


        const name = args[0];
        const color = args[1];


        await createBoosterRole(
            interaction,
            name,
            color
        );

    }

};



async function createBoosterRole(interaction, name, color) {


    const member = interaction.member;


    if(!member.roles.cache.has(BOOSTER_ROLE_ID)) {

        return interaction.reply({

            content:
            "You must be boosting the server to create a custom role.",

            ephemeral:true

        });

    }



    if(boosterRoles.has(member.id)) {

        return interaction.reply({

            content:
            "You already have a booster role. You can only own one.",

            ephemeral:true

        });

    }



    if(!color) {

        color = "#000000";

    }



    if(!/^#[0-9A-F]{6}$/i.test(color)) {

        return interaction.reply({

            content:
            "Invalid color. Use a hex code like `#527357`.",

            ephemeral:true

        });

    }



    const role =
    await interaction.guild.roles.create({

        name:name,

        color:color,

        reason:
        `Booster role created by ${member.user.tag}`

    });



    const botPosition =
    interaction.guild.members.me.roles.highest.position;


    await role.setPosition(botPosition - 1);



    await member.roles.add(role);



    boosterRoles.set(
        member.id,
        role.id
    );



    return interaction.reply({

        embeds:[
            successEmbed(
                "Booster Role Created",
                `Your role **${name}** has been created with color **${color}**.`
            )
        ]

    });

}
