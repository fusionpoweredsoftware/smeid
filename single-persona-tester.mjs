import { Client, GatewayIntentBits } from 'discord.js';
import { sendData } from './persona.mjs';
import fs from 'fs/promises';
import _fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import { randomInt } from 'crypto';

function scrambleString(str) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); // crypto-secure random index
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCK_FILE = path.join(__dirname, 'supermanbot.lock');

const TOKEN = '<discord app token>'; // replace this


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});
const name = "Snarf";
const CHANNELS_FILE = path.join(__dirname, name.toLowerCase()+'.json');
const OUTPUT_DIR = path.join(__dirname, 'channel_messages');
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let nthLetter = 0;
let letter = scrambleString("abcdefghijklmnopqrstuvwy").toUpperCase();
async function fetchAndSaveMessages(channelName, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel.isTextBased()) {
      console.error(`❌ ${channelName} is not a text-based channel.`);
      return;
    }

    let allMessages = [];
    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;

      allMessages.push(...messages.values());
      lastId = messages.last().id;

      if (allMessages.length >= 1000) break; // cap
    }
    
    allMessages.reverse(); // chronological order
    let logLines = allMessages.map(msg => `[${msg.createdAt.toISOString()}] [${msg.author.username}]: ${msg.content}`);

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const outputPath = path.join(OUTPUT_DIR, `${channelName}.txt`);
    let finalContext = `DO NOT give a greeting (this is not a welcome room)!`;
    await fs.writeFile(outputPath, logLines.join('\n'), 'utf8');
    const lastLine = 
    ((logLines && logLines.length > 0 && logLines[logLines.length - 1]) || '[Snarf]').replace('1369438966339731459',"Snarf").replace('369402811405566002',"Snarf").replace(client.user.id, "Snarf").replace("&Snarf", "Snarf");
    console.log(lastLine);
    if (lastLine.includes("[Snarf]"))
      return;
    if (channelName.toLowerCase().includes("welcome")) {
      finalContext = "This is a welcoming room; feel free to greet to your heart's content."
    }
    logLines[logLines.length - 1] = lastLine;
    //const dataSent1 = ("\n\nAnswer `YES` or `NO` in the txt code block (```txt). Does this last chat entry in the discord log entry mention or at (@) mention your name (Snarf)?\n\n"+lastLine+"\n Answer `YES` or `NO` in the txt code block (``` txt) .").replace(client.user.id,"Snarf").replace("&Snarf","Snarf");
    const dataSent = ("\n\nThis is the most recent comment Snarf will be responding to in the txt code block (starting ``` txt):\n" + lastLine).replace('1369438966339731459',"Snarf").replace('369402811405566002',"Snarf").replace(client.user.id, "Snarf").replace("&Snarf", "Snarf");
    // console.log("DATA SENT 1:\n\n", dataSent1)
    /*const dataBack1 = await sendData("snarf.yaml", dataSent1)
    const { fullResponse: fullResponse1 } = dataBack1;
    let txtCodeBlock1 = fullResponse1.split(/```[ \n]?txt/gi);*/
    const second2lastLine = logLines.slice(-2,-1).join();
    if (((second2lastLine.toLowerCase().includes("snarf") && channelName.toLowerCase()=="general" || channelName.toLowerCase()=="welcome" ) || lastLine.toLowerCase().includes("snarf") || channelName.toLowerCase()=="snarf") && !"!?.".includes(lastLine.split("]: ").slice(1,2).join().trim()[0]) && !"!?.".includes(second2lastLine.split("]: ").slice(1,2).join().trim()[0]) ) {
      //const cleanedUpResponse = txtCodeBlock1[1].split("```")[0].trim();
      const context = "\n\nYou've already answered these lines, but this is for context:\n\n" + logLines.slice(-7, -1).join("\n")+`\n\np.s. Don't forget to put your enacted response as Snarf in the txt code block. AND VERY IMPORTANT: Start your sentence with the letter \`${letter[nthLetter++]}\` to aid in emulating good output diversity, while keeping your output under 1000 characters and under 1 paragraph. ${finalContext}`;
      if (nthLetter%24==0) {
        letter = scrambleString(letter);
      }
      let dataBack = null;
      let badResponse = true;
      let responseCount = 0;
      while ((dataBack = (await sendData("snarf.yaml", dataSent, context))) && badResponse && responseCount++<3) {
        console.log("DATA SENT:\n\n", dataSent)
        const { fullResponse } = dataBack;
        let txtCodeBlock = fullResponse.split(/```[ \n]?txt/gi);
        if (txtCodeBlock.length > 1) {
          badResponse=false;
          const cleanedUpResponse = txtCodeBlock[1].split("```")[0].trim();
          console.log("\n\nFINAL RESPONSE:", cleanedUpResponse)
          console.log("\n\n")
          if ( cleanedUpResponse.length<2000) {
            await channel.send(cleanedUpResponse);
          } else {
            await channel.send("(I just tried to send a response, but it was greater than 2000 characters so Discord rejected it.)");
          }
        }
      }
    }

    //console.log(`✅ [${channelName}] Saved ${logLines.length} messages.`);
  } catch (err) {
    console.error(`❌ Error in channel "${channelName}":`, err.message);
  }
}

async function run() {
  const data = await fs.readFile(CHANNELS_FILE, 'utf8');
  const channels = JSON.parse(data);

  for (const [name, id] of Object.entries(channels)) {
    await fetchAndSaveMessages(name, id);
  }
}

const cooldowns = new Map(); // channelId → timestamp
const COOLDOWN_MS = 15 * 1000; // 30 seconds


client.on('messageCreate', async (message) => {
  try {
    const data = await fs.readFile(CHANNELS_FILE, 'utf8');
    const channels = JSON.parse(data);
    if (message.author.bot) return;
    const entry = Object.entries(channels).find(([_, id]) => id === message.channel.id);

    const now = Date.now();
    const lastTriggered = cooldowns.get(message.channel.id) || 0;

    if (now - lastTriggered < COOLDOWN_MS) {
      console.log(`⏳ Cooldown active for channel "${message.channel.id}"`);
      return;
    }

    cooldowns.set(message.channel.id, now);

    if (!entry) {
      console.log(`⚠️ Mention in non-listed channel (${message.channel.id}) ignored.`);
      return;
    }

    const [channelName, channelId] = entry;
    console.log(`🔔 Bot mentioned in "${channelName}" — fetching now.`);
    await fetchAndSaveMessages(channelName, channelId);

  } catch (err) {
    console.error('❌ Error handling mention-triggered fetch:', err.message);
  }
});


client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  run(); // run once immediately
  const interval = setInterval(run, INTERVAL_MS); // repeat every 5 minutes

  process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    clearInterval(interval);
    client.destroy();
    process.exit(0);
  });
});

// Check for existing lock
if (_fs.existsSync(LOCK_FILE)) {
  const existingPid = _fs.readFileSync(LOCK_FILE, 'utf8');
  try {
    process.kill(parseInt(existingPid), 0); // check if process is running
    console.error(`🚫 supermanbot is already running (PID ${existingPid})`);
    process.exit(1);
  } catch {
    console.warn(`⚠️ Stale lock detected. Previous process ${existingPid} not running. Continuing.`);
  }
}

// Write lock
_fs.writeFileSync(LOCK_FILE, process.pid.toString(), 'utf8');

// Clean up lock on exit
const cleanup = () => {
  try {
    _fs.unlinkSync(LOCK_FILE);
    console.log('🧹 Cleaned up supermanbot lock.');
  } catch { }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

client.login(TOKEN);
