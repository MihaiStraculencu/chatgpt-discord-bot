require("dotenv/config");
const { Client, GatewayIntentBits } = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => {
  console.log("The bot is online!");
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith("!")) return;

  let conversationLog = [
    { role: "system", content: "You are a friendly chatbot." },
  ];

  try {
    await message.channel.sendTyping();

    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages = Array.from(prevMessages.values()).reverse(); // Convert to array and reverse

    prevMessages.forEach((msg) => {
      if (message.content.startsWith("!")) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      conversationLog.push({
        role: "user",
        content: msg.content,
      });
    });

    const result = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: conversationLog,
      // max_tokens: 256, // limit token usage
    });

    message.reply(result.choices[0].message.content);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // Rate limiting error, parse reset time
      const resetTime = parseInt(error.response.headers["x-reset"], 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const waitTime = resetTime - currentTime;

      console.log(
        `Rate limited. Please wait for ${waitTime} seconds before sending another request.`
      );
    } else {
      console.log(`ERR: ${error}`);
    }
  }
});

client.login(process.env.TOKEN);
