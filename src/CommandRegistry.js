
import { Command } from './Command.js';
import createLogger from './logger.js';           

const logger = createLogger("CommandRegistry");

export class CommandRegistry {
  static commands = new Map();
  
  static registerCommand(commandModule) {
    if (!commandModule || !commandModule.config) {
      logger.error("Invalid command module format");
      return;
    }
    
    const config = commandModule.config;
    const name = config.name.toLowerCase();
    
    //  Command instance
    const command = new Command(
      name,
      config.description || "No description provided",
      commandModule.onCall,
      {
        aliases: config.aliases || [],
        category: config.category || "misc",
        countDown: config.countDown || 0,
        role: config.role || 0,
        guide: config.guide || "",
        usePrefix: config.usePrefix !== false, // Default to true
        listen: config.listen !== false,      // Default to true
        author: config.author || "Samir"
      }
    );
    
    // Register the command
    this.commands.set(name, command);
    
    // Register aliases
    if (config.aliases && Array.isArray(config.aliases)) {
      for (const alias of config.aliases) {
        this.commands.set(alias.toLowerCase(), command);
      }
    }
    
    logger.main(`Registered command: ${name}`);
    return command;
  }
  
  static getCommand(name) {
    return this.commands.get(name.toLowerCase());
  }
  
  static getAllCommands() {
    // Return only unique commands (not aliases)
    const uniqueCommands = new Map();
    for (const [name, command] of this.commands.entries()) {
      if (name === command.name) {
        uniqueCommands.set(name, command);
      }
    }
    return uniqueCommands;
  }
}
