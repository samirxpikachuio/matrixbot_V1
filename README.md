# matrixbot_V1

A simple yet complex matrix bot designed to enhance user interactions and automate tasks.

## Features
- User-friendly commands for various functionalities.
- Logging of events for better tracking and debugging.
- Modular design for easy extensibility.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/samirxpikachuio/matrixbot_V1.git
   ```
2. Navigate to the project directory:
   ```bash
   cd matrixbot_V1
   ```
3. Install dependencies using Bun.js:
   ```bash
   bun install
   ```

## Usage
To start the bot, run:
```bash
bun run index.js
```

## Codebase Overview
- `index.js`: The entry point of the application.
- `src/`: Contains the main source code for the bot.
  - `Command.js`: Handles command definitions and execution.
  - `CommandRegistry.js`: Manages the registration of commands.
  - `MatrixBot.js`: Core bot functionality and event handling.
  - `Mod.js`: Additional modules for MCA
  

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
This project is licensed under the MIT License.
