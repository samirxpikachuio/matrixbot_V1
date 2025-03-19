// prefix.js
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';

export const config = {
  name: "prefix",
  aliases: ["prefixes"],
  author: "Samir Œ",
  countDown: 5,
  role: 0,
  description: "Displays the bot's prefixes.",
  category: "system",
  guide: "{pn}",
  usePrefix: false
};

export async function onCall(bot, roomId, sender, args, isSelf) {
  // Construct the path to config.json
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Adjust the path to go two levels up from the cmds folder
  const configPath = path.join(__dirname, '..', '..', '..', 'config.json');

  try {
    // Read and parse the config.json file
    const configFile = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configFile);

    // Extract the command prefix
    const commandPrefix = config.commandPrefix;

    // Construct the message
    let message = "🌐 System prefix: " + commandPrefix + "\n";
    message += "🛸 Box chat prefix: " + commandPrefix; // Assuming the box chat prefix is the same for now

    // Send the message to the room
    await bot.sendMessage(roomId, message);

  } catch (error) {
    console.error("Error reading or parsing config.json:", error);
    await bot.sendMessage(roomId, "❌ Failed to load prefixes.  Check bot's logs.");
  }
}