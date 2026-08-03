import { 
    SlashCommandBuilder, 
    PermissionFlagsBits 
} from "discord.js";

import { successEmbed } from "../../utils/embeds.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";

// CHANGE THIS TO YOUR BOOSTER ROLE ID
const BOOSTER_ROLE_ID = "PUT_BOOSTER_ROLE_ID_HERE";

// Simple memory storage
// Replace with database later if you want it permanent
const boosterRoles = new Map();


export default {

    data: new SlashCommandBuilder()
        .setName("customrole")
        .setDescription("Manage your booster custom role")

        .addSubcommand(sub =>
            sub
            .setName("create")
            .setDescription("Create your custom booster role")
            .addStringOption(option =>
                option
                .setName("name")
                .setDescription("Role name")
                .setRequired(true)
            )
            .addStringOption(option =>
                option
                .setName("color")
                .setDescription("Role color hex (#000000)")
                .setRequired(false)
            )
        )


        .addSubcommand(sub =>
            sub
            .setName("rename")
            .setDescription("Rename your custom role")
            .addStringOption(option =>
                option
                .setName("name")
                .setDescription("New role name")
                .setRequired(true)
            )
        )


        .addSubcommand(sub =>
            sub
            .setName("color")
            .setDescription("Change your role color")
            .addStringOption(option =>
                option
                .setName("color")
                .setDescription("New hex color (#FF0000)")
                .setRequired(true)
            )
        ),


    category: "booster",



async execute(interaction) {

    const member = interaction.member;


    // Check booster
    if (!member.roles.cache.has(BOOSTER_ROLE_ID)) {

        return interaction.reply({
            content:
            "You must be a server booster to use custom roles.",
            ephemeral:true
        });

    }



    const sub = interaction.options.getSubcommand();



    // CREATE ROLE
    if(sub === "create") {


        if(boosterRoles.has(member.id)) {

            return interaction.reply({
                content:
                "You already have a custom role. You can only own one.",
                ephemeral:true
            });

        }


        const name =
        interaction.options.getString("name");


        let color =
        interaction.options.getString("color") || "#000000";



        if(!/^#[0-9A-F]{6}$/i.test(color)) {

            return interaction.reply({
                content:
                "Invalid color. Use a hex color like #ff0000.",
                ephemeral:true
            });

        }



        const role =
        await interaction.guild.roles.create({

            name:name,

            color:color,

            reason:
            `Booster custom role for ${member.user.tag}`

        });



        // Put role below bot
        const botRole =
        interaction.guild.members.me.roles.highest.position;


        await role.setPosition(botRole - 1);



        await member.roles.add(role);



        boosterRoles.set(member.id, role.id);



        return interaction.reply({

            embeds:[
                successEmbed(
                    "Custom Role Created",
                    `Your role **${name}** has been created.`
                )
            ]

        });

    }




    const roleID =
    boosterRoles.get(member.id);



    if(!roleID) {

        return interaction.reply({

            content:
            "You do not have a custom role yet. Create one first.",

            ephemeral:true

        });

    }



    const role =
    interaction.guild.roles.cache.get(roleID);



    if(!role) {

        boosterRoles.delete(member.id);

        return interaction.reply({

            content:
            "Your custom role no longer exists.",

            ephemeral:true

        });

    }





    // RENAME

    if(sub === "rename") {

        const name =
        interaction.options.getString("name");


        await role.setName(name);



        return interaction.reply({

            embeds:[
                successEmbed(
                    "Role Updated",
                    `Your role has been renamed to **${name}**.`
                )
            ]

        });

    }





    // COLOR

    if(sub === "color") {

        const color =
        interaction.options.getString("color");


        if(!/^#[0-9A-F]{6}$/i.test(color)) {

            return interaction.reply({

                content:
                "Invalid color. Example: #7289DA",

                ephemeral:true

            });

        }



        await role.setColor(color);



        return interaction.reply({

            embeds:[
                successEmbed(
                    "Role Color Updated",
                    `Your role color is now **${color}**.`
                )
            ]

        });

    }

}

};
