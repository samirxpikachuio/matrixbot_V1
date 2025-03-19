
export const config = {
    name: "eval",
    aliases: ["run"],
    author: "samir ",
    countDown: 0, 
    role: 2, 
    description: "Executes JavaScript code.",
    category: "owner", // Or "admin"
    guide: "{pn} <code>"
};

export async function onCall(bot, roomId, sender, args, isSelf) {
    if (args.length === 0) {
        await bot.sendMessage(roomId, "Please provide code to evaluate.");
        return;
    }

    const code = args.join(" ");

    try {
        
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
        const func = new AsyncFunction('bot', 'roomId', 'sender', 'isSelf', 'args', 'require', 'console', code);

        const result = await func(bot, roomId, sender, isSelf, args, require, console); // Pass require and console

        let resultString;
        if (result === undefined || result === null) {
            resultString = ""; 
        } else {
            resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        }


        await bot.sendMessage(roomId, `\n\`\`\`javascript\n${resultString}\n\`\`\``);

    } catch (error) {
        console.error("Eval error:", error);
        await bot.sendMessage(roomId, `❌ Error:\n\`\`\`javascript\n${error}\n\`\`\``);
    }
}