import createLogger from "./src/logger.js";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { MatrixBot } from "./src/MatrixBot.js";
import config from "./config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = createLogger();

async function main() {
  try {
    if (!fs.existsSync(config.storageDir)) {
      fs.mkdirSync(config.storageDir, { recursive: true });
    }

    const bot = new MatrixBot(config);

    const commandsDir = path.join(__dirname, "src", "scripts", "cmds");
    logger.main(`Looking for commands in: ${commandsDir}`);

    if (fs.existsSync(commandsDir)) {
      const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
      logger.info(`Found command files: ${commandFiles.join(', ')}`);

      for (const file of commandFiles) {
        const commandPath = path.join(commandsDir, file);
        logger.info(`Loading command from: ${commandPath}`);

        try {
          const commandModule = await import(`file://${commandPath}`);
          bot.registerCommand(commandModule);
        } catch (error) {
          logger.warn(`Error loading command ${file}:`, error);
        }
      }
    } else {
      logger.warn(`Commands directory not found: ${commandsDir}`);
    }

    const eventsDir = path.join(__dirname, "src", "scripts", "events");
    logger.main(`Looking for events in: ${eventsDir}`);

    if (fs.existsSync(eventsDir)) {
      const eventFiles = fs.readdirSync(eventsDir).filter(file => file.endsWith('.js'));
      logger.info(`Found event files: ${eventFiles.join(', ')}`);

      for (const file of eventFiles) {
        const eventPath = path.join(eventsDir, file);
        logger.info(`Loading event from: ${eventPath}`);

        try {
          const eventModule = await import(`file://${eventPath}`);
          if (eventModule.default) {
            eventModule.default(bot);
          } else if (eventModule.onLoad) {
            eventModule.onLoad(bot);
          } else {
            logger.warn(`Event module ${file} has no default export or onLoad function`);
          }
        } catch (error) {
          logger.warn(`Error loading event ${file}:`, error);
        }
      }
    } else {
      logger.warn(`Events directory not found: ${eventsDir}`);
    }

    await bot.start();
    logger.main("Bot started successfully!");
  } catch (error) {
    console.error("Failed to start bot:", error
    );
    logger.warn("Failed to start bot:", error);
  }
}

main();
