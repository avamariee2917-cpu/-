import { 
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from "discord.js";
import fs from "fs";
import path from "path";

const JAIL_ROLE_ID = "1532199532916375773";
const LOG_CHANNEL_ID = "1533730276965089390";

const storageFile = path.join(
    process.cwd(),
    "data",
    "jailedUsers.json"
);


function loadJailedUsers() {

    if (!fs.existsSync(storageFile)) {
        fs.mkdirSync(path.dirname(storageFile), { recursive: true });
        fs.writeFileSync(storageFile, "{}");
    }

    return JSON.parse(
        fs.readFileSync(storageFile, "utf8")
    );
}


function saveJailedUsers(data) {

    fs.writeFileSync(
        storageFile,
        JSON.stringify(data, null, 4)
    );

}


export default {

data: new SlashCommandBuilder()

    .setName("jail")
    .setDescription("Jail a member")

    .addUserOption(option =>
        option
        .setName("user")
        .setDescription("Member to jail")
        .setRequired(true)
    )

    .addStringOption(option =>
        option
        .setName("reason")
        .setDescription("Reason for jail")
        .setRequired(false)
    )

    .setDefaultMemberPermissions(
        PermissionFlagsBits.ModerateMembers
    ),


category: "Moderation",


async execute(interaction) {


const target = interaction.options.getMember("user");

const reason =
interaction.options.getString("reason") ||
"No reason provided";


if(!target){

return interaction.reply({
content:"Member not found.",
ephemeral:true
});

}



const jailRole =
interaction.guild.roles.cache.get(
JAIL_ROLE_ID
);


if(!jailRole){

return interaction.reply({
content:"Jail role missing.",
ephemeral:true
});

}



const jailedUsers = loadJailedUsers();



if(jailedUsers[target.id]){

return interaction.reply({
content:"That member is already jailed.",
ephemeral:true
});

}



// Save roles

const savedRoles =
target.roles.cache
.filter(role => role.id !== interaction.guild.id)
.filter(role => !role.managed)
.map(role => role.id);



jailedUsers[target.id] = savedRoles;

saveJailedUsers(jailedUsers);



// DM

await target.send({

embeds:[

new EmbedBuilder()

.setTitle("You have been jailed")

.setDescription(
`You were jailed in **${interaction.guild.name}**.\n\n`+
`**Staff:** ${interaction.user}\n`+
`**Reason:** ${reason}`
)

.setColor("Red")

]

}).catch(()=>{});



// Remove roles

await target.roles.remove(savedRoles)
.catch(()=>{});


// Give jail role

await target.roles.add(jailRole);



// Reply

await interaction.reply({

embeds:[

new EmbedBuilder()

.setTitle("Member Jailed")

.setDescription(
`**Member:** ${target}\n`+
`**Reason:** ${reason}`
)

.setColor("Red")

]

});



// Log

const logChannel =
interaction.guild.channels.cache.get(
LOG_CHANNEL_ID
);


if(logChannel){

await logChannel.send({

embeds:[

new EmbedBuilder()

.setTitle("🔒 Member Jailed")

.setDescription(
`**Member:** ${target}\n`+
`**Jailed By:** ${interaction.user}\n`+
`**Reason:** ${reason}`
)

.setColor("Red")

.setTimestamp()

]

});

}


}

};
