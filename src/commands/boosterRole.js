import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from "discord.js";

const BOOSTER_ROLE_IDS = [
    "1532269323584802836",
    "1533675708193177700"
];

const STAFF_ROLE_ID = "1532221464839848016";
const OWNER_ROLE_ID = "1531440557954437273";

const ROLE_NAME = "Custom Color";

function hasAccess(member) {
    if (!member) return false;

    return (
        member.roles.cache.some(role =>
            BOOSTER_ROLE_IDS.includes(role.id)
        ) ||
        member.roles.cache.has(STAFF_ROLE_ID) ||
        member.roles.cache.has(OWNER_ROLE_ID) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
    );
}

export default {
    data: new SlashCommandBuilder()
        .setName("boosterrole")
        .setDescription("Customize your personal name color role")

        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Set your custom name color")
                .addStringOption(option =>
                    option
                        .setName("color")
                        .setDescription("Hex color, such as #8B0000")
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove your custom name color role")
        ),

    category: "community",

    async execute(interaction) {

        if (!hasAccess(interaction.member)) {
            return interaction.reply({
                content:
                    "You must be a Booster, Staff member, or Owner to use this command.",
                ephemeral: true
            });
        }

        const subcommand =
            interaction.options.getSubcommand();

        /*
         * Find the user's existing custom color role.
         */
        let colorRole =
            interaction.guild.roles.cache.find(
                role =>
                    role.name === ROLE_NAME &&
                    role.managed === false &&
                    role.members.has(interaction.user.id)
            );


        /*
         * SET COLOR
         */
        if (subcommand === "set") {

            let color =
                interaction.options
                    .getString("color")
                    .trim();

            /*
             * Automatically add # if they forgot it.
             */
            if (!color.startsWith("#")) {
                color = `#${color}`;
            }

            /*
             * Make sure it is a valid hex color.
             */
            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                return interaction.reply({
                    content:
                        "That is not a valid color. Please use a 6-digit hex color, such as `#8B0000`.",
                    ephemeral: true
                });
            }


            /*
             * If they don't have a color role,
             * create one.
             */
            if (!colorRole) {

                colorRole =
                    await interaction.guild.roles.create({
                        name: ROLE_NAME,
                        color,
                        reason:
                            `Custom color role for ${interaction.user.tag}`
                    });


                /*
                 * Give the role to the member.
                 */
                await interaction.member.roles.add(
                    colorRole
                );

            } else {

                /*
                 * They already have one,
                 * so simply change its color.
                 */
                await colorRole.setColor(
                    color,
                    `Custom color changed by ${interaction.user.tag}`
                );
            }


            return interaction.reply({
                content:
                    `.⋆♱ Your custom name color has been changed to **${color}**.`,
                ephemeral: true
            });
        }


        /*
         * REMOVE COLOR
         */
        if (subcommand === "remove") {

            if (!colorRole) {
                return interaction.reply({
                    content:
                        "You don't currently have a custom color role.",
                    ephemeral: true
                });
            }


            /*
             * Remove the role from the member first.
             */
            await interaction.member.roles.remove(
                colorRole
            );


            /*
             * Delete the role completely.
             */
            await colorRole.delete(
                `Custom color removed by ${interaction.user.tag}`
            );


            return interaction.reply({
                content:
                    ".⋆♱ Your custom name color has been removed.",
                ephemeral: true
            });
        }
    }
};
