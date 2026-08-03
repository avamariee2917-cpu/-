import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/validation.js';



const MOD_LOG_CHANNEL = "1533730276965089390";


const TEXT_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
];



function resolveTargetChannel(interaction){

    const selected =
        interaction.options.getChannel("channel");


    if(selected){

        return selected;

    }


    if(
        !interaction.channel ||
        !TEXT_CHANNEL_TYPES.includes(interaction.channel.type)
    ){

        return null;

    }


    return interaction.channel;

}





async function sendSayLog(guild, data){


    const channel =

        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Say log channel not found."
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle("Say Command Log")

    .setDescription(

        `**Staff:** ${data.staff}\n\n`+

        `**Channel:** ${data.channel}\n\n`+

        `**Message:**\n${data.message}\n\n`+

        `**Message ID:** ${data.messageId}`

    )

    .setColor("Blue")

    .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        console.log(
            "Failed to send say log:",
            error
        );

    });


}





export default {


data:

new SlashCommandBuilder()

.setName("say")

.setDescription("Send a message as the bot")



.addStringOption(option =>

    option

    .setName("message")

    .setDescription("The message the bot should send")

    .setRequired(true)

    .setMaxLength(2000)

)



.addChannelOption(option =>

    option

    .setName("channel")

    .setDescription("Channel to send in")

    .addChannelTypes(
        ...TEXT_CHANNEL_TYPES
    )

    .setRequired(false)

)



.setDefaultMemberPermissions(

    PermissionFlagsBits.ManageMessages

)



.setDMPermission(false),



category:"moderation",



abuseProtection:{
    maxAttempts:8,
    windowMs:60000
},





async execute(interaction, config, client){



const deferSuccess =

await InteractionHelper.safeDefer(

    interaction,

    {

        flags:MessageFlags.Ephemeral

    }

);





if(!deferSuccess){


logger.warn(

"Say interaction defer failed",

{

userId:interaction.user.id,

guildId:interaction.guildId,

commandName:"say"

}

);


return;

}






const rawMessage =

interaction.options.getString(
    "message"
);



const message =

sanitizeInput(
    rawMessage,
    2000
);






if(!message){


return replyUserError(

interaction,

{

type:ErrorTypes.VALIDATION,

message:
"Message cannot be empty."

}

);


}






const channel =

resolveTargetChannel(
    interaction
);





if(!channel){


return replyUserError(

interaction,

{

type:ErrorTypes.VALIDATION,

message:
"Choose a text channel or run this command in one."

}

);


}






const memberPermissions =

channel.permissionsFor(
    interaction.member
);



const botPermissions =

channel.permissionsFor(
    interaction.guild.members.me
);






if(
    !memberPermissions?.has(
        PermissionFlagsBits.SendMessages
    )
){


return replyUserError(

interaction,

{

type:ErrorTypes.PERMISSION,

message:
`You do not have permission to send messages in ${channel}.`

}

);


}






if(
    !botPermissions?.has(
        PermissionFlagsBits.SendMessages
    )
){


return replyUserError(

interaction,

{

type:ErrorTypes.PERMISSION,

message:
`I do not have permission to send messages in ${channel}.`

}

);


}







const sentMessage =

await channel.send({

content:message

});







await sendSayLog(

interaction.guild,

{

staff:interaction.user,

channel,

message,

messageId:sentMessage.id

}

);







await InteractionHelper.safeEditReply(

interaction,

{

embeds:[

successEmbed(

"Message Sent",

`Message sent in ${channel}.`

)

],

flags:MessageFlags.Ephemeral

}

);



}



};
