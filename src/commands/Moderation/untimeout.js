import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';


const MOD_LOG_CHANNEL = "1533730276965089390";


async function sendUntimeoutDM(user, guild, moderator, reason){

    await user.send({

        embeds:[

            new EmbedBuilder()

            .setTitle("Your timeout has been removed")

            .setDescription(
                `Your timeout in **${guild.name}** has been removed.\n\n`+
                `Staff: ${moderator}\n`+
                `Reason: ${reason}`
            )

            .setColor("Green")
            .setTimestamp()

        ]

    }).catch(()=>{});

}



async function sendUntimeoutLog(guild, data){

    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);


    if(!channel) return;


    const embed =
        new EmbedBuilder()

        .setTitle("Untimeout Log")

        .setDescription(
            `Member: ${data.user}\n\n`+
            `Staff: ${data.moderator}\n`+
            `Reason: ${data.reason}\n`+
            `Case ID: #${data.caseId}`
        )

        .setColor("Green")
        .setTimestamp();



    await channel.send({
        embeds:[embed]
    }).catch(error=>{
        logger.error(
            "Failed to send untimeout log:",
            error
        );
    });

}



export default {


data:

new SlashCommandBuilder()

.setName("untimeout")

.setDescription("Remove a timeout from a user")

.addUserOption(option =>
    option
        .setName("target")
        .setDescription("User to remove timeout from")
        .setRequired(true)
)

.addStringOption(option =>
    option
        .setName("reason")
        .setDescription("Reason for removing timeout")
        .setRequired(false)
)

.setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
),



category:"moderation",



async execute(interaction, config, client){


const targetUser =
    interaction.options.getUser("target");


const member =
    interaction.options.getMember("target");


const reason =
    interaction.options.getString("reason")
    || "No reason provided";



if(!targetUser){

throw new TitanBotError(
    "Missing target user",
    ErrorTypes.USER_INPUT,
    "You must specify a user."
);

}



if(targetUser.id === client.user.id){

throw new TitanBotError(
    "Cannot timeout bot",
    ErrorTypes.VALIDATION,
    "You cannot remove timeout from the bot."
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
await ModerationService.removeTimeout({

    guild: interaction.guild,

    member,

    moderator: interaction.member,

    reason

});





await sendUntimeoutDM(

    targetUser,

    interaction.guild,

    interaction.user,

    reason

);





await sendUntimeoutLog(

    interaction.guild,

    {

        user: targetUser,

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

    `Timeout Removed: ${targetUser.tag}`,

    `Reason: ${reason}\nCase ID: #${result.caseId}`

)

]

}

);



}


};
