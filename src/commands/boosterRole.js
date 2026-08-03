import { SlashCommandBuilder } from "discord.js";
import { getBoosterRole, setBoosterRole } from "../../services/boosterRoleService.js";


const BOOSTER_ROLE_1 = "1532269323584802836";
const BOOSTER_ROLE_2 = "1533675708193177700";


export default {

data: new SlashCommandBuilder()

.setName("br")
.setDescription("Customize your booster role")

.addStringOption(option =>
option
.setName("name")
.setDescription("Change your role name")
)

.addStringOption(option =>
option
.setName("color")
.setDescription("Change role color (#527357)")
),


category: "Community",



async execute(interaction) {


const member = interaction.member;


const booster =
member.roles.cache.has(BOOSTER_ROLE_1) ||
member.roles.cache.has(BOOSTER_ROLE_2);



if (!booster) {

return interaction.reply({

content:
"You must be a booster to use this command.",

ephemeral:true

});

}



let roleId = getBoosterRole(member.id);


let boosterRole = null;



if(roleId){

boosterRole =
interaction.guild.roles.cache.get(roleId);

}




if(!boosterRole){


boosterRole =
await interaction.guild.roles.create({

name:
`✦ ${member.user.username}`,

color:"#000000",

reason:"Booster custom role"

});


await member.roles.add(boosterRole);


setBoosterRole(
member.id,
boosterRole.id
);

}




const name =
interaction.options.getString("name");


const color =
interaction.options.getString("color");




if(name){

await boosterRole.setName(
`✦ ${name}`
);

}



if(color){


if(!/^#[0-9A-F]{6}$/i.test(color)){


return interaction.reply({

content:
"Invalid color. Example: #527357",

ephemeral:true

});


}



await boosterRole.setColor(color);


}




await interaction.reply({

content:
`Your booster role has been updated: ${boosterRole}`,

ephemeral:true

});


}

};
