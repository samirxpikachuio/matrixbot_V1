// help.js
export const config = {
  name: "help",
  aliases: ["h", "commands", "cmds"],
  author: "Samir Œ",
  countDown: 5,
  role: 0,
  description: "Show available commands.",
  category: "system",
  guide: "{pn} [command]"
};

export async function onCall(bot, roomId, sender, args, isSelf) {
  const prefix = bot.config.commandPrefix;

  if (args.length > 0) {
    // (Existing code for specific command help - no changes needed)
    const commandName = args[0].toLowerCase();
    const command = bot.commands.get(commandName);

    if (!command) {
      await bot.sendMessage(roomId, `Command "${commandName}" not found.`);
      return;
    }

    let helpText = `Command: ${prefix}${command.name}\n`;
    helpText += `Description: ${command.description}\n`;
    helpText += `Category: ${command.category}\n`;

    if (command.aliases.length > 0) {
      helpText += `Aliases: ${command.aliases.join(", ")}\n`;
    }

    helpText += `Author: ${command.author}\n`;
    helpText += `Cooldown: ${command.countDown} seconds\n`;
    helpText += `Required role: ${getRoleName(command.role)}\n`;
    helpText += `Prefix required: ${command.usePrefix ? "Yes" : "No"}\n`;

    if (command.guide) {
      helpText += `Usage: ${command.guide.replace(/\{pn\}/g, prefix + command.name)}\n`;
    }

    await bot.sendMessage(roomId, helpText);
    return;
  }

  const categories = new Map();

  for (const [name, command] of bot.commands) {
    if (name !== command.name) continue;

    if (!categories.has(command.category)) {
      categories.set(command.category, []);
    }

    categories.get(command.category).push(command);
  }

  let helpText = ""; // Changed from "Available Commands:\n\n"

  for (const [category, commands] of categories) {
    helpText += `╭──『 ${category.toUpperCase()} 』\n`; // Modified category header
    helpText += " ✧ "; // Add indent 

    const commandNames = commands.map(command => command.name); // Extracts only names of commands

    helpText += commandNames.join(" ✧ "); // Adds command name seperated by the diamond symbol. 
    
    helpText += `\n╰────────────◊\n\n`; // Modified category footer
  }

  helpText += `Type ${prefix}help [command] for detailed information about a specific command.`;

  await bot.sendMessage(roomId, helpText);
}

function getRoleName(role) {
  switch (role) {
    case 0: return "All Users";
    case 1: return "Moderator";
    case 2: return "Admin";
    default: return `Level ${role}`;
  }
}