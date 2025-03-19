// gen.js
import * as https from 'https';

export const config = {
  name: "gen",
  aliases: ["generate", "imagegen"],
  author: "Your Name",
  countDown: 10, // API might have rate limits
  role: 0,
  description: "Generates an image from a prompt using an external API.",
  category: "image",
  guide: "{pn} <prompt>"
};

export async function onCall(bot, roomId, sender, args, isSelf) {
  if (args.length === 0) {
    await bot.sendMessage(roomId, "Please provide a prompt.");
    return;
  }

  const prompt = args.join(" ");
  const apiUrl = `https://www.arch2devs.ct.ws/api/weigen?prompt=${encodeURIComponent(prompt)}`;

  try {
    // 1. Fetch the image as a buffer
    const imageBuffer = await getImageBuffer(apiUrl);

    if (!imageBuffer) {
      await bot.sendMessage(roomId, "❌ Failed to generate image.  API might be down or returned an error.");
      return;
    }

    // 2. Upload the image to Matrix
    const uploadResult = await bot.client.uploadContent(imageBuffer, "image/png");

    if (!uploadResult || !uploadResult.content_uri) {
      console.error("Upload result:", uploadResult); // Log for debugging
      await bot.sendMessage(roomId, "❌ Failed to upload image to Matrix.");
      return;
    }

    // 3. Send the image message
    await bot.client.sendMessage(roomId, {
      msgtype: "m.image",
      body: 'difhsiudfhvos.jpg', // Use the prompt as the image description
      url: uploadResult.content_uri,
    });

  } catch (error) {
    console.error("Error during image generation or upload:", error);
    await bot.sendMessage(roomId, "❌ An error occurred while generating or sending the image.");
  }
}

// Helper function to fetch the image as a buffer
async function getImageBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      res.on('error', (error) => {
        console.error("Error fetching image:", error);
        reject(error);
      });
    }).on('error', (error) => {
      console.error("Error during https.get:", error);
      reject(error);
    });
  });
}