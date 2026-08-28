import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId =
    process.env.GUILD_ID ||
    process.env.DISCORD_GUILD_ID;

if (!token) {
    throw new Error('Missing DISCORD_TOKEN or TOKEN');
}

if (!clientId) {
    throw new Error('Missing CLIENT_ID');
}

if (!guildId) {
    throw new Error('Missing GUILD_ID or DISCORD_GUILD_ID');
}

const rest = new REST({ version: '10' }).setToken(token);

const globalCommands = await rest.get(
    Routes.applicationCommands(clientId)
);

const guildCommands = await rest.get(
    Routes.applicationGuildCommands(clientId, guildId)
);

console.log('\n==============================');
console.log('GLOBAL COMMANDS');
console.log('==============================');

const globalMatches = globalCommands.filter(
    command => command.name === 'ban'
);

for (const command of globalMatches) {
    console.log(`/ban`);
    console.log(`ID: ${command.id}`);
    console.log(`Description: ${command.description}`);
}

console.log(`Total global /ban: ${globalMatches.length}`);

console.log('\n==============================');
console.log('GUILD COMMANDS');
console.log('==============================');

const guildMatches = guildCommands.filter(
    command => command.name === 'ban'
);

for (const command of guildMatches) {
    console.log(`/ban`);
    console.log(`ID: ${command.id}`);
    console.log(`Description: ${command.description}`);
}

console.log(`Total guild /ban: ${guildMatches.length}`);

console.log('\n==============================');
console.log('RESULT');
console.log('==============================');

console.log(
    `Global /ban: ${globalMatches.length}`
);

console.log(
    `Guild /ban: ${guildMatches.length}`
);

console.log(
    `Combined: ${globalMatches.length + guildMatches.length}`
);
