import {
    SlashCommandBuilder
} from "discord.js";

import fs from "fs";
import path from "path";


const BOOSTER_ROLES = [
    "1532269323584802836",
    "1533675708193177700"
];

const STAFF_ROLE =
"1532221464839848016";


const filePath = path.join(
    process.cwd(),
    "data",
    "nameReacts.json"
);



function loadData(){

    if(!fs.existsSync(filePath)){

        fs.mkdirSync(
            path.dirname(filePath),
            {recursive:true}
        );

        fs.writeFileSync(
            filePath,
            "{}"
        );

    }


    return JSON.parse(
        fs.readFileSync(filePath,"utf8")
    );

}



function saveData(data){

    fs.writeFileSync(
        filePath,
        JSON.stringify(data,null,4)
    );

}



function hasPermission(member){

    return (

        BOOSTER_ROLES.some(role =>
            member.roles.cache.has(role)
        )

        ||

        member.roles.cache.has(STAFF_ROLE)

    );

}



function cleanEmoji(input){

    if(!input) return null;

    return input.trim();

}



export default {


data:

new SlashCommandBuilder()

.setName("namereact")

.setDescription("Manage your name reactions")


.addSubcommand(sub =>

sub

.setName("set")

.setDescription("Create your name reaction")

.addStringOption(option =>

option

.setName("name")

.setDescription("The name people will type")

.setRequired(true)

)


.addStringOption(option =>

option

.setName("emoji1")

.setDescription("First emoji")

.setRequired(true)

)


.addStringOption(option =>

option

.setName("emoji2")

.setDescription("Second emoji")

.setRequired(false)

)


.addStringOption(option =>

option

.setName("emoji3")

.setDescription("Third emoji")

.setRequired(false)

)

)



.addSubcommand(sub =>

sub

.setName("remove")

.setDescription("Remove your name reaction")

),



category:"community",



async execute(interaction){


const member =
interaction.member;



if(!hasPermission(member)){


return interaction.reply({

content:
"Only boosters and staff can use this command.",

ephemeral:true

});


}



const data =
loadData();



const action =
interaction.options.getSubcommand();




if(action === "set"){



const name =
interaction.options.getString("name")
.toLowerCase();



const emojis = [

cleanEmoji(
interaction.options.getString("emoji1")
),

cleanEmoji(
interaction.options.getString("emoji2")
),

cleanEmoji(
interaction.options.getString("emoji3")
)

]

.filter(Boolean);



if(emojis.length > 3){

return interaction.reply({

content:
"You can only use 3 emojis maximum.",

ephemeral:true

});

}




data[member.id] = {

name,

emojis,

userId:member.id

};



saveData(data);



return interaction.reply({

content:

`Your name reaction has been set for **${name}**.`,

ephemeral:true

});



}





if(action === "remove"){



if(!data[member.id]){


return interaction.reply({

content:
"You do not have a name reaction set.",

ephemeral:true

});


}



delete data[member.id];


saveData(data);



return interaction.reply({

content:
"Your name reaction has been removed.",

ephemeral:true

});


}



}



};
