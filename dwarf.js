const Discord = require('discord.js');
const fs = require('fs');
const dotenv = require('dotenv');
const listFilePath = './members.json';
const timerFilePath = './timer.json';

dotenv.config();

const { Client, Intents } = require('discord.js');
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
  ],
});

let list = [];         // To store the list of members
let embarkTimeout;     // To store the timeout identifier
let embarkTime;        // To store the embark time

try {
  const membersList = JSON.parse(fs.readFileSync(listFilePath, 'utf8'));
  console.log('Successfully read members list:', membersList);
  list = membersList;
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`File not found: ${listFilePath}`);
  } else {
    console.error('Error reading list file:', error);
  }
}

try {
  const timerData = JSON.parse(fs.readFileSync(timerFilePath, 'utf8'));
  console.log('Successfully read timer data:', timerData);
  embarkTime = timerData.embarkTime;
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`File not found: ${timerFilePath}`);
  } else {
    console.error('Error reading timer file:', error);
  }
}

client.on('ready', () => {
    console.log(`${client.user.tag}: I am online`);
    client.user.setActivity('Managing the Dwarven Caravan');

    // Schedule the embark message if embarkTime is set
    if (embarkTime) {
        const timeUntilEmbark = embarkTime - Date.now();
        if (timeUntilEmbark > 0) {
            embarkTimeout = setTimeout(() => sendEmbarkMessage(client.channels.cache.get(process.env.CHANNEL_ID)), timeUntilEmbark);
        } else {
            // If embark time has already passed, send the message immediately
            sendEmbarkMessage(client.channels.cache.get(process.env.CHANNEL_ID));
        }
    }
});

client.on('messageCreate', msg => {
    if (msg.author.bot) return;

    const args = msg.content.split(" ");
    const command = args[0].toLowerCase();

    if (command === `${process.env.PREFIX}join`) {
        // Command to join the list
        if (!list.some(member => member.id === msg.author.id)) {
            list.push({ id: msg.author.id, name: msg.author.username });
            saveListToFile();
            msg.reply(`${msg.author.username} has joined the caravan!`);
        } else {
            msg.reply('you are already on the list.');
        }
    } else if (command === `${process.env.PREFIX}leave`) {
        // Command to leave the list
        const index = list.findIndex(member => member.id === msg.author.id);
        if (index !== -1) {
            list.splice(index, 1);
            saveListToFile();
            msg.reply(`${msg.author.username} has departed for distant lands unknown!`);
        } else {
            msg.reply('you are not on the list.');
        }
    } else if (command === `${process.env.PREFIX}randomize`) {
        // Command to randomize the list
        if (list.length > 1) {
            list.sort(() => Math.random() - 0.5);
            saveListToFile();
            msg.channel.send('The list has been randomized!');
        } else {
            msg.reply('there are not enough members on the list to randomize.');
        }
    } else if (command === `${process.env.PREFIX}list`) {
        // Command to list all members
        if (list.length > 0) {
            const memberList = list.map(member => member.name).join(', ');
            msg.channel.send(`Members: ${memberList}`);
        } else {
            msg.channel.send('The list is empty.');
        }
    } else if (command === `${process.env.PREFIX}next`) {
        // Command to rotate the person at the top to the bottom
        rotateList();
        const nextPerson = list[0] ? list[0].name : '';
        msg.channel.send(`${msg.author.username}, ${nextPerson} has moved to the top of the list. A dwarf takes on the role of the storyteller!`);
        // Reset embark timer when /next is given
        if (embarkTimeout) {
            clearTimeout(embarkTimeout);
            embarkTimeout = setTimeout(() => sendEmbarkMessage(msg.channel), calculateNextEmbarkTime());
        }
    } else if (command === `${process.env.PREFIX}losingisfun`) {
        // Command to start the weekly event
        stopWeeklyEvent(msg.channel);
    } else if (command === `${process.env.PREFIX}embark`) {
        // Command to stop the weekly event
        startWeeklyEvent(msg.channel);
        const topPerson = list[0] ? list[0].name : '';
        msg.channel.send(`May your anvils ring true, your forges burn bright, and your tankards never dry ${topPerson}!`);
    }
});

function startWeeklyEvent(channel) {
    // Set the embark time and schedule the embark message
    embarkTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // One week later
    embarkTimeout = setTimeout(() => sendEmbarkMessage(channel), calculateNextEmbarkTime());

    // Save the embark time to the JSON file
    saveTimerToFile();
}

function stopWeeklyEvent(channel) {
    // Stop the embark timer if it's running
    if (embarkTimeout) {
        clearTimeout(embarkTimeout);
        channel.send('The weekly event has been canceled.');
        // Clear the embark time and save to the JSON file
        embarkTime = null;
        saveTimerToFile();
    }
}

function calculateNextEmbarkTime() {
    // Replace this logic with your own calculation for the next embark time
    const nextEmbarkDate = new Date();
    nextEmbarkDate.setDate(nextEmbarkDate.getDate() + 7); // Set it to one week from now

    // Check if the calculated time exceeds the maximum value for a 32-bit signed integer
    const maxTimeoutValue = 2147483647; // Maximum value for a 32-bit signed integer
    const calculatedTime = nextEmbarkDate.getTime();

    if (calculatedTime > maxTimeoutValue) {
        // If it exceeds, calculate the difference between now and one week from now
        const timeDifference = calculatedTime - Date.now();
        return timeDifference;
    }

    return calculatedTime;
}

function sendEmbarkMessage(channel) {
    const topPerson = list[0] ? list[0].name : '';
    channel.send(`A caravan has arrived from the East! They wish to hear ${topPerson}'s tales over a pint of plump helmet 馃嵑`);
}

function saveListToFile() {
    fs.writeFileSync(listFilePath, JSON.stringify(list), 'utf-8');
}

function loadListFromFile() {
    try {
        const data = fs.readFileSync(listFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading list file:', error.message);
        return [];
    }
}

function saveTimerToFile() {
    // Save the embark time to the JSON file
    const timerData = { embarkTime };
    fs.writeFileSync(timerFilePath, JSON.stringify(timerData), 'utf-8');
}

client.login(process.env.DISCORD_TOKEN);