// test.js
import * as requestModule from 'request';

export const config = {
  name: "test",
  aliases: [],
  author: "Your Name",
  countDown: 5,
  role: 0,
  description: "Tests image upload and sending.",
  category: "testing",
  guide: "{pn}"
};

export async function onCall(bot, roomId, sender, args, isSelf) {
  
  if (args.length === 0) {
    await bot.sendMessage(roomId, "Please provide a prompt.");
    return;
  }


  const prompt = args.join(" ");

  const request = requestModule.defaults({ encoding: null }); // Important: Ensure binary data is handled correctly

  const imageUrl =  `https://www.arch2devs.ct.ws/api/weigen?prompt=${encodeURIComponent(prompt)}`

  const infoMatrix = {
    "name": "test.jpg", 
    "type": "image/jpg",
    "rawResponse": 0,
    "onlyContentUri": 1
  };

  request.get(imageUrl, async function (err, res, body) { // Use async/await for cleaner code
    if (err) {
      console.error("Error downloading image:", err);
      await bot.sendMessage(roomId, "❌ Error downloading image.");
      return;
    }

    if (res.statusCode !== 200) {
      console.error("Image download failed with status:", res.statusCode);
      await bot.sendMessage(roomId, `❌ Image download failed with status: ${res.statusCode}`);
      return;
    }

    try {
      const url = await bot.client.uploadContent(body, infoMatrix);  // Await the upload
      console.log("Uploaded image URL:", url);

      const content = {
        msgtype: "m.image",
        body: "test.jpg", // Important: Use the correct filename
        url: url
      };

      await bot.client.sendMessage(roomId, content); // Await the message send
    } catch (uploadError) {
      console.error("Error uploading or sending image:", uploadError);
      await bot.sendMessage(roomId, "❌ Error uploading or sending image.");
    }
  });
}