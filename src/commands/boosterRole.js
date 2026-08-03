import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";
import fs from "fs";
import path from "path";


const BOOSTER_ROLE_1 = "1532269323584802836";
const BOOSTER_ROLE_2 = "1533675708193177700";


const storageFile = path.join(
    process.cwd(),
    "data",
    "boosterRoles.json"
);



function loadRoles() {

    if (!fs.existsSync(storageFile)) {

        fs.mkdirSync(
            path.dirname(storageFile),
            { recursive: true }
        );

        fs.writeFileSync(
            storageFile,
            "{}"
        );

    }


    return JSON.parse(
        fs.readFileSync(storageFile, "utf8")
    );

}



function saveRoles(data) {

    fs.writeFileSync(
        storageFile,
        JSON.stringify(data, null, 4)
    );

}



function isBooster(member) {

    return (
        member.roles.cache.has(BOOSTER_ROLE_1) ||
        member.roles.cache.has(BOOSTER_ROLE_2)
    );

}



export default {

data: new SlashCommandBuilder()

    .setName("br")

    .setDescription(
        "Manage your booster role"
    )


    .addSubcommand(sub =>
        sub
        .setName("create")
        .setDescription(
            "Create your booster role"
        )

        .addStringOption(option =>
            option
            .setName("name")
            .setDescription(
                "Role name"
            )
            .setRequired(true)
        )

        .addStringOption(option =>
            option
            .setName("color")
            .setDescription(
                "Role color (#527357)"
            )
            .setRequired(false)
        )
    )


    .addSubcommand(sub =>
        sub
        .setName("update")
        .setDescription(
            "Update your booster role"
        )

        .addStringOption(option =>
            option
            .setName("name")
            .setDescription(
                "New role name"
            )
            .setRequired(false)
        )

        .addStringOption(option =>
            option
            .setName("color")
            .setDescription(
                "New role color"
            )
            .setRequired(false)
        )
    )


    .addSubcommand(sub =>
        sub
        .setName("delete")
        .setDescription(
            "Delete your booster role"
        )
    ),



category: "Community",



async execute(interaction) {


const member = interaction.member;



if (!isBooster(member)) {

return interaction.reply({

content:
"Only server boosters can use this command.",

});

}



const roles = loadRoles();


const existingRoleId =
roles[member.id];


let existingRole = null;


if(existingRoleId){

existingRole =
interaction.guild.roles.cache.get(
existingRoleId
);

}



const action =
interaction.options.getSubcommand();




// CREATE

if(action === "create"){


if(existingRole){

const buttons =
new ActionRowBuilder()
.addComponents(

new ButtonBuilder()
.setCustomId("update_br")
.setLabel("Update BR Role")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("delete_br")
.setLabel("Delete BR Role")
.setStyle(ButtonStyle.Danger)

);



return interaction.reply({

content:
"Sorry, you already created a booster role.",

components:[
buttons
]

});

}



const name =
interaction.options.getString("name");


const color =
interaction.options.getString("color") || "#000000";



const role =
await interaction.guild.roles.create({

name:name,

color:color,

reason:
"Booster custom role"

});



await member.roles.add(role);



roles[member.id] =
role.id;


saveRoles(roles);



return interaction.reply({

content:
`Your booster role has been created: ${role}`

});

}




// UPDATE

if(action === "update"){


if(!existingRole){

return interaction.reply({

content:
"You do not have a booster role yet."

});

}



const name =
interaction.options.getString("name");


const color =
interaction.options.getString("color");



if(name){

await existingRole.setName(name);

}



if(color){

if(!/^#[0-9A-F]{6}$/i.test(color)){

return interaction.reply({

content:
"Invalid color format. Example: #527357"

});

}


await existingRole.setColor(color);

}



return interaction.reply({

content:
`Your booster role has been updated: ${existingRole}`

});

}




// DELETE

if(action === "delete"){


if(!existingRole){

return interaction.reply({

content:
"You do not have a booster role to delete."

});

}



await existingRole.delete(
"Booster deleted their custom role"
);



delete roles[member.id];


saveRoles(roles);



return interaction.reply({

content:
"Your booster role has been deleted."

});

}


}

};
