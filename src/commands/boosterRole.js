import { SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";

const BOOSTER_ROLE_1 = "1532269323584802836";
const BOOSTER_ROLE_2 = "1533675708193177700";

const storagePath = path.join(
    process.cwd(),
    "data",
    "boosterRoles.json"
);


function getStoredRoles() {

    if (!fs.existsSync(storagePath)) {

        fs.mkdirSync(
            path.dirname(storagePath),
            { recursive: true }
        );

        fs.writeFileSync(
            storagePath,
            "{}"
        );

    }


    return JSON.parse(
        fs.readFileSync(storagePath, "utf8")
    );

}



function saveStoredRoles(data) {

    fs.writeFileSync(
        storagePath,
        JSON.stringify(data, null, 4)
    );

}



export default {

    data: new SlashCommandBuilder()

        .setName("br")

        .setDescription(
            "Customize your booster role"
        )

        .addStringOption(option =>
            option
                .setName("name")
                .setDescription(
                    "Set your role name"
                )
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("color")
                .setDescription(
                    "Set your role color (#527357)"
                )
                .setRequired(false)
        ),


    category: "Community",



    async execute(interaction) {


        const member = interaction.member;



        const hasBooster =
            member.roles.cache.has(BOOSTER_ROLE_1) ||
            member.roles.cache.has(BOOSTER_ROLE_2);



        if (!hasBooster) {

            return interaction.reply({

                content:
                    "You must be a booster to use this command.",

                ephemeral: true

            });

        }



        const roles = getStoredRoles();



        let boosterRole = null;



        if (roles[member.id]) {

            boosterRole =
                interaction.guild.roles.cache.get(
                    roles[member.id]
                );

        }



        if (!boosterRole) {


            boosterRole =
                await interaction.guild.roles.create({

                    name:
                        `✦ ${member.user.username}`,

                    color:
                        "#000000",

                    reason:
                        "Booster custom role"

                });



            await member.roles.add(
                boosterRole
            );


            roles[member.id] =
                boosterRole.id;


            saveStoredRoles(
                roles
            );

        }



        const newName =
            interaction.options.getString("name");


        const newColor =
            interaction.options.getString("color");



        if (newName) {

            await boosterRole.setName(
                `✦ ${newName}`
            );

        }



        if (newColor) {


            if (
                !/^#[0-9A-F]{6}$/i.test(newColor)
            ) {

                return interaction.reply({

                    content:
                        "Invalid color format. Example: #527357",

                    ephemeral: true

                });

            }



            await boosterRole.setColor(
                newColor
            );

        }



        return interaction.reply({

            content:
                `Your booster role has been updated: ${boosterRole}`,

            ephemeral: true

        });


    }

};
