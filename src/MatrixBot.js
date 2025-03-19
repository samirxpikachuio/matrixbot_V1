import pkg from 'matrix-bot-sdk';
const {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  RustSdkCryptoClient
} = pkg;
import * as path from "path";
import { CommandRegistry } from './CommandRegistry.js';
import createLogger from './logger.js';
import { MatrixBotHelpers } from './Mod.js';

 //  const cryptoProvider = new RustSdkCryptoStorageProvider("./path/to/directory");
const logger = createLogger();

export class MatrixBot {
  constructor(config) {
    this.config = config;
    this.listenToSelf = config.listenToSelf;
    
    this.storageProvider = new SimpleFsStorageProvider(
      path.join(config.storageDir, "bot.json")
    );
    
    this.client = new MatrixClient(
      config.homeserverUrl, 
      config.accessToken, 
      this.storageProvider
    );
  
    AutojoinRoomsMixin.setupOnClient(this.client);
    this.client.on("room.message", this.onRoomMessage.bind(this));
    this.roleCache = new Map();
    
    // Add all helper methods to this class
    Object.assign(this, MatrixBotHelpers);
  }
  
  registerCommand(commandModule) {
    return CommandRegistry.registerCommand(commandModule);
  }
  
  get commands() {
    return CommandRegistry.getAllCommands();
  }
  
  async processCommand(roomId, sender, commandName, args, isSelf) {
    const command = CommandRegistry.getCommand(commandName);
    if (command) {
      await command.execute(this, roomId, sender, args, isSelf);
    } else {
      await this.client.sendMessage(roomId, {
        msgtype: "m.text",
        body: `Unknown command: ${commandName}. Type ${this.config.commandPrefix}help for available commands.`
      });
    }
  }
  
  async onRoomMessage(roomId, event) {
    if (!event.content) return;
    
    const sender = event.sender;
    const body = event.content.body;
    if (!body) return; 
    
    const botUserId = await this.client.getUserId();
    const isSelf = sender === botUserId;
    
    if (isSelf && !this.listenToSelf) return;
    
    logger.main(`${roomId}: ${sender} ${isSelf ? '(self)' : ''} says '${body}'`);
    
    if (body && body.startsWith(this.config.commandPrefix)) {
      const parts = body.slice(this.config.commandPrefix.length).trim().split(/\s+/);
      const commandName = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      await this.processCommand(roomId, sender, commandName, args, isSelf);
      return;
    }
    
    const parts = body.trim().split(/\s+/);
    const potentialCommand = CommandRegistry.getCommand(parts[0].toLowerCase());
    
    if (potentialCommand && !potentialCommand.usePrefix) {
      const args = parts.slice(1);
      await potentialCommand.execute(this, roomId, sender, args, isSelf);
    }
  }
  
  async start() {
    await this.client.start();
    logger.info("Client started!");
    
    await this.client.sendMessage(this.config.defaultRoomId, {
      msgtype: "m.text",
      body: "Bot is now online! "
    });
    logger.warn("NOTE: This version doesn't have E2E encryption support yet.");
    logger.warn("      You can use it in unencrypted private rooms.");
  }
}
