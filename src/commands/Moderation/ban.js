import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';


const MOD_LOG_CHANNEL = "1533730276965089390";



async function sendBanLog(guild, data) {

    const channel =
        guild.channels.cache.get(
            MOD_LOG_CHANNEL
        );


    if (!channel) return;


    const embed = new EmbedBuilder()

        .setTitle("Ban Log")

        .setDescription(

            `**Member:** ${data.user}\n\n`+

            `**Staff:** ${data.moderator}\n`+

            `**Reason:** ${data.reason}\n`+

            `**Case ID:** #${data.caseId}`

        )

        .setColor("Red")

        .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(()=>{});

}




async function sendBanDM(user, guild, moderator, reason){

    await user.send({

        embeds:[

            new EmbedBuilder()

            .setTitle("You have been banned")

            .setDescription(

                `You have been banned from **${guild.name}**.\n\n`+

                `**Staff:** ${moderator}\n`+

                `**Reason:** ${reason}`

            )

            .setColor("Red")

            .setTimestamp()

        ]

    }).catch(()=>{});

}





export default {


data: new SlashCommandBuilder()

.setName("ban")

.setDescription("Ban a user from the server")


.addUserOption(option =>

    option

    .setName("target")

    .setDescription("The user to ban")

    .setRequired(true)

)


.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for the ban")

    .setRequired(false)

)


.setDefaultMemberPermissions(

    PermissionFlagsBits.BanMembers

),



category:"moderation",




async execute(interaction, config, client){



const user =
interaction.options.getUser("target");



const reason =
interaction.options.getString("reason")
||
"No reason provided";





if(!user){

throw new TitanBotError(

"Missing target user",

ErrorTypes.USER_INPUT,

"You must specify a user to ban."

);

}




if(user.id === interaction.user.id){

throw new TitanBotError(

"Cannot ban self",

ErrorTypes.VALIDATION,

"You cannot ban yourself."

);

}




if(user.id === client.user.id){

throw new TitanBotError(

"Cannot ban bot",

ErrorTypes.VALIDATION,

"You cannot ban the bot."

);

}




const result =
await ModerationService.banUser({

guild: interaction.guild,

user,

moderator: interaction.member,

reason

});






await sendBanDM(

user,

interaction.guild,

interaction.user,

reason

);






await sendBanLog(

interaction.guild,

{

user,

moderator: interaction.user,

reason,

caseId: result.caseId

}

);







await InteractionHelper.universalReply(

interaction,

{

embeds:[

successEmbed(

`Banned ${user.tag}`,

`Reason: ${reason}\nCase ID: #${result.caseId}`

)

]

}

);



},





prefixExecute: async(message,args,client)=>{


const input =
args[0];



if(!input){

return message.reply(

"Please provide a user mention or ID."

);

}





let user = null;




const mention =
input.match(/^<@!?(\d+)>$/);



if(mention){

user =
await client.users.fetch(
mention[1]
).catch(()=>null);

}





if(!user && /^\d{17,20}$/.test(input)){

user =
await client.users.fetch(
input
).catch(()=>null);

}





if(!user){

return message.reply(

"I could not find that user."

);

}





const reason =
args.slice(1).join(" ")
||
"No reason provided";





const result =
await ModerationService.banUser({

guild: message.guild,

user,

moderator: message.member,

reason

});





await sendBanDM(

user,

message.guild,

message.author,

reason

);





await sendBanLog(

message.guild,

{

user,

moderator: message.author,

reason,

caseId: result.caseId

}

);






await message.reply({

embeds:[

successEmbed(

`Banned ${user.tag}`,

`Reason: ${reason}\nCase ID: #${result.caseId}`

)

]

});



}


};
