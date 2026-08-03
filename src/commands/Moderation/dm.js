import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/validation.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';



const MOD_LOG_CHANNEL = "1533730276965089390";



export default {

data:

new SlashCommandBuilder()

.setName("dm")

.setDescription("Send a direct message to a user (Staff only)")


.addUserOption(option =>

    option

    .setName("user")

    .setDescription("The user to send a DM to")

    .setRequired(true)

)



.addStringOption(option =>

    option

    .setName("message")

    .setDescription("The message to send")

    .setRequired(true)

)



.addBooleanOption(option =>

    option

    .setName("anonymous")

    .setDescription("Send the message anonymously")

    .setRequired(false)

)



.setDefaultMemberPermissions(

    PermissionFlagsBits.ModerateMembers

)



.setDMPermission(false),



category:"moderation",





async execute(interaction, config, client){



const deferSuccess =

await InteractionHelper.safeDefer(

    interaction

);



if(!deferSuccess){

logger.warn(

"DM interaction defer failed",

{

userId:interaction.user.id,

guildId:interaction.guildId,

commandName:"dm"

}

);


return;

}





const targetUser =

interaction.options.getUser("user");



const message =

interaction.options.getString("message");



const anonymous =

interaction.options.getBoolean("anonymous")

|| false;






try {



if(message.length > 2000){

return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:"Messages must be under 2000 characters."

}

);

}






if(targetUser.bot){

return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:"You cannot send DMs to bot accounts."

}

);

}






const sanitized =

sanitizeMarkdown(message);






await targetUser.send({

embeds:[

new EmbedBuilder()

.setTitle(

anonymous

? "Message from the Staff Team"

: `Message from ${interaction.user.tag}`

)

.setDescription(

sanitized

)

.setColor("Blue")

.setFooter({

text:"You cannot reply to this message."

})

.setTimestamp()

]

});







await logEvent({

client,

guild:interaction.guild,

event:{


action:"Staff DM Sent",


target:

`${targetUser.tag} (${targetUser.id})`,



executor:

`${interaction.user.tag} (${interaction.user.id})`,



reason:

sanitized.length > 200

? `${sanitized.slice(0,200)}...`

: sanitized,



metadata:{


userId:targetUser.id,


moderatorId:interaction.user.id,


anonymous,


messageLength:sanitized.length


}


}


});








const logChannel =

await interaction.guild.channels.fetch(

MOD_LOG_CHANNEL

).catch(()=>null);





if(logChannel){


await logChannel.send({

embeds:[

new EmbedBuilder()

.setTitle("Staff DM Log")

.setDescription(

`Member: ${targetUser}\n\n`+

`Staff: ${interaction.user}\n\n`+

`Anonymous: ${anonymous ? "Yes" : "No"}\n\n`+

`Message:\n${sanitized}`

)

.setColor("Blue")

.setTimestamp()

]

}).catch(()=>{});


}







return InteractionHelper.safeEditReply(

interaction,

{

embeds:[

successEmbed(

"DM Sent",

`Successfully sent a message to ${targetUser.tag}`

)

]

}

);






}

catch(error){


logger.error(

"DM command error:",

error

);




if(error.code === 50007){

return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:`Could not send a DM to ${targetUser.tag}. They may have DMs disabled.`

}

);

}




return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:`Failed to send DM: ${error.message}`

}

);



}



}


};
