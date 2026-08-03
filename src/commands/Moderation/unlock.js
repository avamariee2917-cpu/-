import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';



const MOD_LOG_CHANNEL = "1533730276965089390";



async function sendUnlockLog(guild, data){

    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Unlock log channel not found."
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle("Channel Unlock Log")

    .setDescription(

        `**Channel:** ${data.channel}\n\n`+

        `**Staff:** ${data.staff}\n\n`+

        `**Reason:** ${data.reason}`

    )

    .setColor("Green")

    .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        console.log(
            "Failed to send unlock log:",
            error
        );

    });

}





export default {


data:

new SlashCommandBuilder()

.setName("unlock")

.setDescription(
    "Unlocks the current channel."
)



.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for unlocking the channel")

    .setRequired(false)

)



.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels
),



category:"moderation",





async execute(interaction, config, client){



const deferSuccess =

await InteractionHelper.safeDefer(

    interaction

);





if(!deferSuccess){

logger.warn(

"Unlock interaction defer failed",

{

userId:interaction.user.id,

guildId:interaction.guildId,

commandName:"unlock"

}

);


return;

}







const channel =

interaction.channel;



const everyoneRole =

interaction.guild.roles.everyone;





const reason =

interaction.options.getString("reason")

||

"No reason provided";






try{



const currentPermissions =

channel.permissionsFor(

    everyoneRole

);






if(

currentPermissions.has(

PermissionFlagsBits.SendMessages

)

=== true

||

currentPermissions.has(

PermissionFlagsBits.SendMessages

)

=== null

){



return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:
`${channel} is not locked.`

}

);



}







await channel.permissionOverwrites.edit(

everyoneRole,

{

SendMessages:true

},

{

type:0,

reason:
`Channel unlocked by ${interaction.user.tag}`

}

);







await sendUnlockLog(

interaction.guild,

{

channel,

staff:interaction.user,

reason

}

);







await InteractionHelper.safeEditReply(

interaction,

{

embeds:[

successEmbed(

"Channel Unlocked",

`${channel} is now unlocked.\n\nReason: ${reason}`

)

]

}

);






}

catch(error){



logger.error(

"Unlock command error:",

error

);





await replyUserError(

interaction,

{

type:ErrorTypes.PERMISSION,

message:
"An error occurred while unlocking the channel. Check my permissions."

}

);



}



}



};
