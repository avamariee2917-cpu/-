import { SlashCommandBuilder } from "discord.js";

const BOOSTER_ROLE_1 = "1532269323584802836";
const BOOSTER_ROLE_2 = "1533675708193177700";


export default {

data: new SlashCommandBuilder()

.setName("br")

.setDescription("Customize your booster role")

.addStringOption(option =>
option
.setName("name")
.setDescription("Role name")
)

.addStringOption(option =>
option
.setName("color")
.setDescription("Role color (#527357)")
),


category: "Community",


async execute(interaction) {


const member = interaction.member;


if (
!member.roles.cache.has(BOOSTER_ROLE_1) &&
!member.roles.cache.has(BOOSTER_ROLE_2)
) {

return interaction.reply({

content:
"You must be a booster to use this.",

ephemeral:true

});

}



let role =
interaction.guild.roles.cache.find(
r => r.name === `✦ ${member.user.username}`
);



if(!role){

role =
await interaction.guild.roles.create({

name:
`✦ ${member.user.username}`,

color:
"#000000"

});


await member.roles.add(role);

}



const name =
interaction.options.getString("name");


const color =
interaction.options.getString("color");



if(name){

await role.setName(
`✦ ${name}`
);

}



if(color){

await role.setColor(color);

}



await interaction.reply({

content:
`Updated your booster role: ${role}`,

ephemeral:true

});


}

};
