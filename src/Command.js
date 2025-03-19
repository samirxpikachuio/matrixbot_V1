
import createLogger from "./logger";
  
const logger = createLogger();
export class Command {
  constructor(name, description, executeFunction, options = {}) {
    this.name = name;
    this.description = description;
    this._execute = executeFunction;
   
    this.aliases = options.aliases || [];
    this.category = options.category || "misc";
    this.countDown = options.countDown || 0;
    this.role = options.role || 0;
    this.guide = options.guide || "";
    this.usePrefix = options.usePrefix !== false; // Default to true
    this.listen = options.listen !== false;      // Default to true
    this.author = options.author || "Unknown";
   
    this.cooldowns = new Map();
  }
  
  async execute(bot, roomId, sender, args, isSelf) {
    if (isSelf && !this.listen) return;
    

    if (this.countDown > 0) {
      const now = Date.now();
      if (this.cooldowns.has(sender)) {
        const expirationTime = this.cooldowns.get(sender) + (this.countDown * 1000);
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          await bot.sendMessage(roomId, `Please wait ${timeLeft.toFixed(1)} more seconds before using the ${this.name} command again.`);
          return;
        }
      }
      this.cooldowns.set(sender, now);
    }
    
    
    const userRole = await bot.getUserRole(sender, roomId);
    if (userRole < this.role) {
      await bot.sendMessage(roomId, `You don't have permission to use the ${this.name} command.`);
      return;
    }
    
   
    try {
      return await this._execute(bot, roomId, sender, args, isSelf);
    } catch (error) {
      logger.error(`Error executing command ${this.name}:`, error);
      await bot.sendMessage(roomId, `Error executing command: ${error.message}`);
    }
  }
}