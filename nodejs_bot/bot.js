// File: /path/to/your/bot/bot.js

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const chokidar = require('chokidar');

// === CONFIGURATION ===
const GROUP_ID = process.env.WHATSAPP_GROUP_ID;
const EVENTS_PATH = process.env.EVENTS_PATH || '/opt/scripts/lol_dashboard/events';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LP_LOSS_WATCHLIST = (process.env.LP_LOSS_WATCHLIST || 'player1,player2').split(',');

// --- Gemini API Configuration ---
if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY environment variable not found in .env file!");
  process.exit(1);
}
if (!GROUP_ID) {
  console.error("ERROR: WHATSAPP_GROUP_ID environment variable not found in .env file!");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// === GEMINI PROMPT GENERATION FUNCTIONS ===

async function generateLpLossPhrase(playerName, lpLost) {
  const styles = [
    { name: "Cursed Poet", prompt: `You are a Cursed Poet. The player "${playerName}" just lost ${lpLost} LP. Write a short, rhyming quatrain (ABAB or AABB) celebrating their glorious defeat.` },
    { name: "Sarcastic Sports Caster", prompt: `You are a Sarcastic Sports Caster. "${playerName}" just lost ${lpLost} LP. Describe this performance with a medium-length comment, full of exaggerated sports metaphors.` },
    { name: "Snarky and Concise", prompt: `You are a cynical bot. "${playerName}" just lost ${lpLost} LP. Dismiss them with a very short and sharp one-liner (max 10 words).` },
  ];
  const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
  const finalPrompt = `Your persona: ${chosenStyle.name}. Your task: ${chosenStyle.prompt}. Respond in English. Do not include the LP number in your response.`;
  try {
    console.log(`?? Sending prompt to Gemini (LP Loss) for ${playerName} with style "${chosenStyle.name}"...`);
    const result = await model.generateContent(finalPrompt);
    return result.response.text().trim();
  } catch (error) {
    console.error(`Gemini Error (LP Loss - ${chosenStyle.name}):`, error.message);
    return `${playerName} lost LP. The AI is on strike.`;
  }
}

async function generateOvertakePhrase(winner, loser) {
    const prompt = `BREAKING NEWS: A leaderboard overtake has just occurred! "${winner.tag}" has actively climbed past "${loser.tag}". You are an over-the-top, excited sports announcer. Create a SHORT and EPIC comment (1-2 sentences) to describe this moment. Winner: ${winner.tag} (${winner.tier} ${winner.rank}). Loser: ${loser.tag} (${loser.tier} ${loser.rank}). Respond in English.`;
    try { const result = await model.generateContent(prompt); return result.response.text().trim(); } catch (error) { console.error("Gemini Error (Overtake):", error.message); return `Incredible! ${winner.tag} has overtaken ${loser.tag}!`; }
}

async function generateUndertakePhrase(winner, loser) {
    const prompt = `DRAMA ON THE LADDER: An "undertake" has just happened! Due to a catastrophic fall, "${loser.tag}" has plummeted below "${winner.tag}". You are a cynical announcer. Create a SHORT and SNARKY comment (1-2 sentences) about the loser's disastrous performance. New higher-ranked player: ${winner.tag} (${winner.tier} ${winner.rank}). The one who fell: ${loser.tag} (${loser.tier} ${loser.rank}). Respond in English.`;
    try { const result = await model.generateContent(prompt); return result.response.text().trim(); } catch (error) { console.error("Gemini Error (Undertake):", error.message); return `Unbelievable! ${loser.tag} dropped so hard they're now below ${winner.tag}!`; }
}

async function generateWeeklySummaryPhrase(summaryData) {
    const prompt = `You are a sports journalist writing the "Weekly Wrap-up" for a League of Legends news segment. You need to write a CONCISE summary of the week. You can talk about players температура or create small groups. The goal is to be brief and impactful, not a long paragraph for each player. Use an epic but synthetic tone. Here is the weekly data: ${JSON.stringify(summaryData, null, 2)}. Create a bulletin that summarizes the main movements, who climbed the most, who fell the hardest, and any interesting rivalries. Start with a headline. Respond in English.`;
    try { const result = await model.generateContent(prompt); return result.response.text().trim(); } catch (error) { console.error("Gemini Error (Weekly Summary):", error.message); return `**Weekly Wrap-up**\nThe commentary could not be generated.`; }
}

// === EVENT HANDLER ===
async function handleNewEventFile(filePath, client) {
  try {
    const fileName = path.basename(filePath);
    console.log(`?? New event file detected: ${fileName}`);
    let message = "";

    if (fileName.startsWith('lp_loss_')) {
      const playerNameRaw = fileName.replace('lp_loss_', '').replace('.txt', '');
      const playerNameClean = playerNameRaw.replace(/_/g, ' ').toLowerCase();

      if (LP_LOSS_WATCHLIST.includes(playerNameClean)) {
        console.log(`?? ${playerNameRaw} is on the watchlist, generating LP loss notification...`);
        const lpLost = await fs.readFile(filePath, 'utf-8');
        const phrase = await generateLpLossPhrase(playerNameRaw.replace(/_/g, ' '), lpLost);
        message = `${phrase} -*${lpLost} LP*`;
      } else {
        console.log(`?? ${playerNameRaw} is not on the LP loss watchlist. Event ignored.`);
      }
    } 
    else if (fileName.startsWith('overtake_') || fileName.startsWith('undertake_')) {
      const eventData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      const { eventType, winner, loser } = eventData;
      if (eventType === 'overtake') message = await generateOvertakePhrase(winner, loser);
      else if (eventType === 'undertake') message = await generateUndertakePhrase(winner, loser);
    } 
    else if (fileName.startsWith('weekly_summary')) {
      console.log("?? Weekly summary event detected!");
      const summaryData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      message = await generateWeeklySummaryPhrase(summaryData);
    }
    
    if (message) {
      console.log(`?? Message generated, sending...`);
      await client.sendMessage(GROUP_ID, message);
      console.log(`? Message sent successfully!`);
    }

    await fs.unlink(filePath);
    console.log(`?? Event file ${fileName} processed and deleted.`);

  } catch (error) {
    console.error(`? Error while handling event file ${path.basename(filePath)}:`, error);
  }
}

// === INITIALIZATION LOGIC ===
console.log('?? Starting LoL Announcer Bot...');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
  }
});

client.on('qr', qrcode.generate);

client.on('ready', () => {
  console.log('? Client is connected and ready!');
  console.log(`?? Listening for new events in: ${EVENTS_PATH}`);
  const watcher = chokidar.watch(EVENTS_PATH, {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
  });
  watcher
    .on('add', (filePath) => handleNewEventFile(filePath, client))
    .on('error', error => console.error('? Watcher error:', error))
    .on('ready', () => console.log('?? Chokidar is ready and monitoring the folder.'));
});

client.on('auth_failure', msg => console.error('? AUTHENTICATION FAILED:', msg));
client.on('disconnected', reason => console.warn('?? Disconnected from WhatsApp:', reason));

client.initialize().catch(err => {
    console.error('? Critical error during initialization:', err);
});

process.on('SIGINT', async () => {
  console.log('?? SIGINT received. Shutting down gracefully...');
  await client.destroy();
  console.log('? WhatsApp client destroyed successfully.');
  process.exit(0);
});