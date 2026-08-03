import { SlashCommandBuilder } from "discord.js";
import { successEmbed } from "../../utils/embeds.js";


// Booster roles
const BOOSTER_ROLE_IDS = [
    "1532269323584802836", // 1 booster
    "1533675708193177700"  // 2 booster
];


// Temporary role ownership storage
// Move this to a database later
const boosterRoles = new Map();



export default {

    data: new SlashCommandBuilder()
        .setName("br")
        .setDescription("Booster custom role commands")

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
                .setDescription("Role color (#527357)")
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
                .setDescription("New color (#527357)")
                .setRequired(true)
            )
        ),



    category: "booster",



    async execute(interaction) {

        await boosterCommand(interaction);

    },



    // Prefix command
    // Example:
    // br veil #527357

    prefixExecute: async (interaction) => {


        const args =
        interaction.options._hoistedOptions
        .map(option => option.value);



        const name = args[0];
        const color = args[1] || "#000000";



        if(!name){

            return interaction.reply({
                content:
                "Usage: `br <name> <color>`\nExample: `br veil #527357`",
                ephemeral:true
            });

        }



        await createRole(
            interaction,
            name,
            color
        );

    }

};





async function boosterCommand(interaction){


    const member = interaction.member;



    if(!isBooster(member)){


        return interaction.reply({

            content:
            "You must be boosting the server to use booster roles.",

            ephemeral:true

        });

    }



    const action =
    interaction.options.getSubcommand();



    if(action === "create"){


        const name =
        interaction.options.getString("name");


        const color =
        interaction.options.getString("color") || "#000000";



        return createRole(
            interaction,
            name,
            color
        );

    }



    const roleID =
    boosterRoles.get(member.id);



    if(!roleID){


        return interaction.reply({

            content:
            "You do not have a custom role yet. Create one first.",

            ephemeral:true

        });

    }



    const role =
    interaction.guild.roles.cache.get(roleID);



    if(!role){


        boosterRoles.delete(member.id);


        return interaction.reply({

            content:
            "Your custom role no longer exists.",

            ephemeral:true

        });

    }





    if(action === "rename"){


        const name =
        interaction.options.getString("name");


        await role.setName(name);



        return interaction.reply({

            embeds:[
                successEmbed(
                    "Role Renamed",
                    `Your booster role is now **${name}**`
                )
            ]

        });

    }





    if(action === "color"){


        const color =
        interaction.options.getString("color");



        if(!validColor(color)){


            return interaction.reply({

                content:
                "Invalid color. Example: `#527357`",

                ephemeral:true

            });

        }



        await role.setColor(color);



        return interaction.reply({

            embeds:[
                successEmbed(
                    "Role Color Updated",
                    `Your role color is now **${color}**`
                )
            ]

        });

    }

}





async function createRole(interaction, name, color){


    const member =
    interaction.member;



    if(!isBooster(member)){


        return interaction.reply({

            content:
            "You must be boosting the server to create a role.",

            ephemeral:true

        });

    }




    if(boosterRoles.has(member.id)){


        return interaction.reply({

            content:
            "You already have a custom booster role.",

            ephemeral:true

        });

    }




    if(!validColor(color)){


        return interaction.reply({

            content:
            "Invalid color. Example: `#527357`",

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




    // Put role below bot role

    const botRole =
    interaction.guild.members.me.roles.highest.position;


    await role.setPosition(botRole - 1);



    await member.roles.add(role);



    boosterRoles.set(
        member.id,
        role.id
    );




    return interaction.reply({

        embeds:[
            successEmbed(
                "Booster Role Created",
                `Created **${name}** with color **${color}**`
            )
        ]

    });

}





function isBooster(member){

    return member.roles.cache.some(role =>
        BOOSTER_ROLE_IDS.includes(role.id)
    );

}





function validColor(color){

    return /^#[0-9A-F]{6}$/i.test(color);

}
