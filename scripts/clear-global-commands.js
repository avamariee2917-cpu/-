import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) {
    throw new Error('DISCORD_TOKEN or TOKEN is missing.');
}

if (!clientId) {
    throw new Error('CLIENT_ID is missing.');
}

const rest = new REST({ version: '10' }).setToken(token);

try {
    console.log('Clearing old GLOBAL slash commands...');

    await rest.put(
        Routes.applicationCommands(clientId),
        {
            body: [],
        }
    );

    console.log('✅ Old global commands have been cleared.');
    console.log('Your server-specific commands were NOT touched.');
} catch (error) {
    console.error('❌ Failed to clear global commands:', error);
    process.exit(1);
}
