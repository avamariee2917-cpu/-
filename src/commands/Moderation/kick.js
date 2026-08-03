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



async function sendKickLog(guild, data){


    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Kick log channel not found."
        );

        return;

    }




    const embed = new EmbedBuilder()

    .setTitle("Kick Log")

    .setDescription(

        `**Member:** ${data.user}\n\n`+

        `**Staff:** ${data.moderator}\n`+

        `**Reason:** ${data.reason}\n`+

        `**Case ID:** #${data.caseId}`

    )

    .setColor("Orange")

    .setTimestamp();




    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        console.log(
            "Failed to send kick log:",
            error
        );

    });


}





async function sendKickDM(user, guild, moderator, reason){


    await user.send({

        embeds:[

            new EmbedBuilder()

            .setTitle("You have been kicked")

            .setDescription(

                `You have been kicked from **${guild.name}**.\n\n`+

                `**Staff:** ${moderator}\n`+

                `**Reason:** ${reason}`

            )

            .setColor("Orange")

            .setTimestamp()

        ]

    }).catch(()=>{});


}






export default {


data: new SlashCommandBuilder()

.setName("kick")

.setDescription("Kick a user from the server")



.addUserOption(option =>

    option

    .setName("target")

    .setDescription("The user to kick")

    .setRequired(true)

)



.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for the kick")

    .setRequired(false)

)



.setDefaultMemberPermissions(
    PermissionFlagsBits.KickMembers
),




category:"moderation",





async execute(interaction, config, client){



const targetUser =
interaction.options.getUser("target");



const member =
interaction.options.getMember("target");



const reason =
interaction.options.getString("reason")
||
"No reason provided";





if(!targetUser){

throw new TitanBotError(

"Missing target user",

ErrorTypes.USER_INPUT,

"You must specify a user to kick."

);

}





if(targetUser.id === interaction.user.id){


throw new TitanBotError(

"Cannot kick self",

ErrorTypes.VALIDATION,

"You cannot kick yourself."

);


}





if(targetUser.id === client.user.id){


throw new TitanBotError(

"Cannot kick bot",

ErrorTypes.VALIDATION,

"You cannot kick the bot."

);


}






if(!member){


throw new TitanBotError(

"Target not found",

ErrorTypes.USER_INPUT,

"The target user is not currently in this server."

);


}







const result =
await ModerationService.kickUser({

guild:interaction.guild,

member,

moderator:interaction.member,

reason

});







await sendKickDM(

targetUser,

interaction.guild,

interaction.user,

reason

);








await sendKickLog(

interaction.guild,

{

user:targetUser,

moderator:interaction.user,

reason,

caseId:result.caseId

}

);








await InteractionHelper.universalReply(

interaction,

{

embeds:[

successEmbed(

`Kicked ${targetUser.tag}`,

`Reason: ${reason}\nCase ID: #${result.caseId}`

)

]

}

);



}



};
