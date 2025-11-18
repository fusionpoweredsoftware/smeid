import { Client, GatewayIntentBits } from 'discord.js';
import { sendData } from './persona.mjs';
import fs from 'fs/promises';
import _fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process, { pid } from 'process';
import { randomInt } from 'crypto';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const memoized = {};
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getNameAndId(botName) {
    botName = botName.replace(/ /g,"_").toLowerCase()
  if (memoized[botName])
      return memoized[botName];
  const PROFILE_FILE = path.join(__dirname, botName+'.json');
  const profileData = await fs.readFile(PROFILE_FILE, 'utf8');
  const { name, id, alias } = JSON.parse(profileData);
  memoized[botName] = { name, id, alias };
  return { name, id, alias };
}

export async function loadBot({ botName, run_interval_ms, specificChannelId=null, oneAndDone = false,inquiry = (name) => `This is the most recent comment that '${name}' will be responding to`, handler = undefined, pidid = "discordbot" }) {
  if (!run_interval_ms)
      run_interval_ms=INTERVAL_MS;
  const { id, name, alias } = await getNameAndId(botName);
  let _alias = alias || name;
  let oneMessageSent = false;
  pidid += (oneAndDone ? '' : 'oad');
  function scrambleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1); // crypto-secure random index
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  const LOCK_FILE = path.join(__dirname, pidid + '.lock');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  });
  //const name = process.argv[2];
  const PROFILE_FILE = path.join(__dirname, botName.replace(/ /g,"_").toLowerCase()+'.json');
  const OUTPUT_DIR = path.join(__dirname, 'channel_messages');

  const profileData = await fs.readFile(PROFILE_FILE, 'utf8');
  const { token: TOKEN } = JSON.parse(profileData);

  let nthLetter = 0;
  let letter = scrambleString("abcdefghijklmnopqrstuvwy").toUpperCase();
  async function fetchAndSaveMessages(channelName, channelId) {
    if (oneMessageSent && oneAndDone)
        return;
    if (specificChannelId && channelId!=specificChannelId)
      return;
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel.isTextBased()) {
        console.error(`❌ ${channelName} is not a text-based channel.`);
        return;
      }
      if (!handler)
        handler = async (message,$,_channelId) => {
          const channel = await client.channels.fetch(_channelId);
          await channel.send(message);
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
      const lastLine = ((logLines && logLines.length > 0 && logLines[logLines.length - 1]) || `[${name}]`).replace(client.user.id, `${name}`).replace("&" + name, name);
      console.log(lastLine);
      if (lastLine.includes(`[${name}]`))
        return;
      if (allMessages[allMessages.length - 1].author.bot && !(channel.topic || '').toLowerCase().includes("bots talk to each other"))
        return;
      if (allMessages[allMessages.length - 1].author.id == client.user.id)
        return;
      if (channelName.toLowerCase().includes("welcome")) {
        finalContext = "This is a welcoming room; feel free to greet to your heart's content."
      }
      if (Math.floor(Math.random() * 4)==0 && name!=="Smeid") {
        finalContext += ` AND... THIS IS VERY IMPORTANT: Keep your response as ${name} less than 21 words short.`;
      } else if (Math.floor(Math.random() * 4)==1 && name!=="Smeid") {
        finalContext += ` AND... THIS IS VERY IMPORTANT: Keep your response as ${name} less than 13 words short.`;
      } else if (Math.floor(Math.random() * 4)==2  && name!=="Smeid") {
        finalContext += ` AND... THIS IS VERY IMPORTANT: Keep your response as ${name} 8 words or less short.`;
      }
      logLines[logLines.length - 1] = lastLine;
      const dataSent = (`\n\n${inquiry(name)} in the txt code block (starting \`\`\` txt):\n` + lastLine).replace(client.user.id, name).replace("&" + name, name);

      const second2lastLine = logLines.slice(-2, -1).join();
      if (name=="Smeid" || (((channel.topic || '').toLowerCase().includes("bots get a say") || (allMessages[allMessages.length-1] && allMessages[allMessages.length-1].mentions.has(id)) || (allMessages[allMessages.length-2] && allMessages[allMessages.length-2].mentions.has(id)) || channelName.toLowerCase().endsWith(`${_alias.toLowerCase()}`)) && !"!?.".includes(lastLine.split("]: ").slice(1, 2).join().trim()[0]) && !"!?.".includes(second2lastLine.split("]: ").slice(1, 2).join().trim()[0]))) {
        const context = "\n\nYou've already answered these lines, but this is for context:\n\n" + logLines.slice(-7, -1).join("\n") + `\n\np.s. Don't forget to put your enacted response as ${name} in the txt code block. AND VERY IMPORTANT: Start your sentence with the letter \`${letter[nthLetter++]}\` to aid in emulating good output diversity, while keeping your output under 1000 characters and under 1 paragraph. ${finalContext}`;
        if (nthLetter % 24 == 0) {
          letter = scrambleString(letter);
        }
        let dataBack = null;
        let badResponse = true;
        let responseCount = 0;
        while ((dataBack = (await sendData(botName.replace(/ /g,"_").toLowerCase() + ".yaml", dataSent, context))) && badResponse && responseCount++ < 3) {
          console.log("\nDATA SENT:\n", dataSent)
          const { fullResponse } = dataBack;
          let txtCodeBlock = fullResponse.split(/```[ \n]?txt/gi);
          if (txtCodeBlock.length > 1) {
            badResponse = false;
            const cleanedUpResponse = txtCodeBlock[1].split("```")[0].trim();
            console.log("\n\nFINAL RESPONSE:", cleanedUpResponse)
            console.log("\n\n")
            if (cleanedUpResponse.length < 2000) {
              await handler(cleanedUpResponse, channelName, channelId, allMessages);
            } else {
              await handler("(I just tried to send a response, but it was greater than 2000 characters so Discord rejected it.)", channelName, channelId, allMessages);
            }
            oneMessageSent=true;
          }
        }
      }

      //console.log(`✅ [${channelName}] Saved ${logLines.length} messages.`);
    } catch (err) {
      console.error(`❌ Error in channel "${channelName}":`, err.message);
    }
  }

  async function run() {
    const data = await fs.readFile(PROFILE_FILE, 'utf8');
    const { channels } = JSON.parse(data);

    for (const [name, id] of Object.entries(channels)) {
      await fetchAndSaveMessages(name, id);
    }
  }

  const cooldowns = new Map(); // channelId → timestamp
  const COOLDOWN_MS = 15 * 1000; // 30 seconds

  if (!oneAndDone) {
    client.on('messageCreate', async (message) => {
      try {
        const data = await fs.readFile(PROFILE_FILE, 'utf8');
        const { channels } = JSON.parse(data);
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
  }

  // Clean up lock on exit
  const cleanup = () => {
    try {
      _fs.unlinkSync(LOCK_FILE);
      console.log(`🧹 Cleaned up ${pidid} lock.`);
    } catch { }
  };

  client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
  
    if (!oneAndDone) {
      run(); // run once immediately
      const interval = setInterval(run, run_interval_ms); // repeat every 5 minutes

      process.on('SIGINT', () => {
        console.log('🛑 Shutting down...');
        clearInterval(interval);
        client.destroy();
        cleanup();
        process.exit(0);
      });
    } else {
      await run();
      console.log('🛑 Back to you Smeid...');
      client.destroy();
      cleanup();
    }
  });

  if (!oneAndDone) {
    // Check for existing lock
    if (_fs.existsSync(LOCK_FILE)) {
      const existingPid = _fs.readFileSync(LOCK_FILE, 'utf8');
      try {
        process.kill(parseInt(existingPid), 0); // check if process is running
        console.error(`🚫 ${pidid} is already running (PID ${existingPid})`);
        process.exit(1);
      } catch {
        console.warn(`⚠️ Stale lock detected. Previous process ${existingPid} not running. Continuing.`);
      }
    }
    // Write lock
    _fs.writeFileSync(LOCK_FILE, process.pid.toString(), 'utf8');
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await client.login(TOKEN);

}