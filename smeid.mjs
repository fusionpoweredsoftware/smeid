import { loadBot } from './smeid-lib.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const memoized = {};
async function getNameAndId(botName) {
  if (!botName)
    return { name: "none", id: null, alias: null}
  botName = botName.replace(/ /g,"_").toLowerCase()
  if (memoized[botName])
      return memoized[botName];
  const PROFILE_FILE = path.join(__dirname, botName+'.json');
  const profileData = await fs.readFile(PROFILE_FILE, 'utf8');
  const { name, id, alias } = JSON.parse(profileData);
  memoized[botName] = { name, id, alias };
  return { name, id, alias };
}

const listOfBots = ['Ada Lovelace', 'Snarf', 'Einstein','none'];
//const inquiry = undefined; //(name)=>`This is the most recent comment that '${name}' will be responding to`;
const inquiry = (name)=>`This is the most recent comment that you need to figure out which SME to involve ('Ada Lovelace', 'Snarf', 'Einstein', 'none') and tell me which TWO (if any) of these two SMEs you believe is most qualified in a TWO-NAME ANSWER SEPERATED BY SEMICOLON. This means put your TWO-NAME ANSWER SEPERATED BY SEMICOLON (e.g. firstChoice;secondChoice)`;
const handler = async (response, channelName, channelId, allMessages) => {
  let mentioned=false;
  let [ firstChoice, secondChoice ] = response.split(";")

  if (firstChoice==="none")
    return;
  if (secondChoice=="none")
    secondChoice="";

  for (let bot of listOfBots) {
    if (bot!=="none") {
      const { name, id } = await getNameAndId(bot);
      if (allMessages[allMessages.length-1].mentions.has(id)) {
        firstChoice = name;
        mentioned=true;
      }
    }
  }
  let chosenSME = firstChoice;
  const firstChoiceData = await getNameAndId(firstChoice);
  const secondChoiceData = await getNameAndId(secondChoice);
  
  if (allMessages[allMessages.length-1].author.id == firstChoiceData.id) {
    chosenSME = secondChoiceData.name;
  }
  //  if (logLines[logLines.length-1].author.id)
  const lowerCaseListOfBots = listOfBots.map(a=> a.toLowerCase());
  for (let bot of lowerCaseListOfBots) {
    if (bot!=="none") {
      const { name, alias } = await getNameAndId(bot);
      let _alias = alias || name;
      if (channelName.toLowerCase().includes(_alias.toLowerCase()) && bot!=="none" && !mentioned) {
        console.log(`However, the name of the channel is the name of a bot (${bot}), so SMEID is overruled.`);
        firstChoice=bot;
        chosenSME=bot;
      }
    }
  }
  if (firstChoice!=="none" && chosenSME!=="none" && lowerCaseListOfBots.includes(chosenSME.toLowerCase())) {
    await loadBot({botName:chosenSME, specificChannelId: channelId, oneAndDone: true});
  }
}
const botName = process.argv[2] || "Smeid";

if (botName=="Smeid")
  await loadBot({botName, run_interval_ms: process.argv[3] || 60000*5, inquiry, handler, pidid: "discordbotsmeid"});
else
  await loadBot({botName, run_interval_ms: process.argv[3] || 60000*5});
