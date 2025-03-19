// echo.js
export const config = {
  name: "echo",
  aliases: ["say", "repeat"],
  author: "Samir Œ",
  countDown: 50,
  role: 0,
  description: "Repeats what you say.",
  category: "utility",
  guide: "{pn} <message>",
  usePrefix: false
};

export async function onCall(bot, roomId, sender, args, isSelf) {
  if (args.length === 0) {
    await bot.client.sendMessage(roomId, "Please provide a message to echo.");
    return;
  }

  const message = args.join(" ");
  await bot.sendMessage(roomId, message);
}