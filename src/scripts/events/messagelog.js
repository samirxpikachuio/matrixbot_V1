import createLogger from "../../logger";
 
const logger = createLogger();


export const config = {
    name: "messageLogger",
    author: "Samir Œ",
    description: "Logs all messages to console"
  };
  
  export function onLoad(bot) {
    bot.client.on("room.message", async (roomId, event) => {
      if (!event.content || !event.content.body) return;
    logger.main(`[LOGGER] ${roomId}: ${event.sender} said: ${event.content.body}`);
    });
    
     logger.info(`[${config.name}] Event handler loaded!`);
  }
  
  
  export default function(bot) {
    onLoad(bot);
  }
