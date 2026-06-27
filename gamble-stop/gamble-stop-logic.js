import {
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { DiscordRequest } from "../utils.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCoinFlip(req, streak = 0) {
  try {
    const { token } = req.body;
    const applicationId = req.body.application_id || process.env.APP_ID;
    const user = req.body.member?.user || req.body.user;
    const username = user?.username || "Gamer";

    const frames = [
      { emoji: "🔄", text: "Flipping... 🔄" },
      { emoji: "💿", text: "Flipping... 💿" },
      { emoji: "🔄", text: "Flipping... 🔄" },
    ];

    for (const frame of frames) {
      await sleep(400);
      await DiscordRequest(
        `webhooks/${applicationId}/${token}/messages/@original`,
        {
          method: "PATCH",
          body: {
            embeds: [
              {
                title: "🪙 Coin Flip",
                description: `${frame.text}\nLet's see what the fates decide!${
                  streak > 0 ? `\n\n🔥 Play Again Streak: **${streak}**` : ""
                }`,
                color: 0x3498db, // blue
                thumbnail: {
                  url: "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1fa99.png",
                },
              },
            ],
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.BUTTON,
                    custom_id: "gamble_flip_again_spinning",
                    label: "Flipping...",
                    style: 2, // SECONDARY
                    disabled: true,
                  },
                ],
              },
            ],
          },
        },
      );
    }

    await sleep(400);
    const isWin = Math.random() >= 0.15; // 85% heads (one more), 15% tails (stop)

    let finalTitle,
      finalDesc,
      finalColor,
      finalThumbnail,
      buttonLabel,
      buttonStyle,
      customId;

    if (isWin) {
      const newStreak = streak + 1;
      finalTitle = `👑 Play One More! (Streak: ${newStreak})`;
      finalDesc = `### The coin landed on Play!\n\n**Keep Playing! 🎰**\n\n🔥 Current Streak: **${newStreak}**`;
      finalColor = 0x2ecc71; // green
      finalThumbnail =
        "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f451.png"; // crown
      buttonLabel = "Flip Again?";
      buttonStyle = 3; // SUCCESS
      customId = `gamble_flip_again_${newStreak}`;
    } else {
      finalTitle = "🦅 Stop! No More!";
      finalDesc = `### The coin landed on Stop!\n\n**Close the game! 😭**\n\n💀 Streak ended at: **${streak}**`;
      finalColor = 0xe74c3c; // red
      finalThumbnail =
        "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f985.png"; // eagle
      buttonLabel = "Flipped Stop (Stopped)";
      buttonStyle = 4; // DANGER
      customId = "gamble_flip_again_ended";
    }

    await DiscordRequest(
      `webhooks/${applicationId}/${token}/messages/@original`,
      {
        method: "PATCH",
        body: {
          embeds: [
            {
              title: finalTitle,
              description: finalDesc,
              color: finalColor,
              thumbnail: {
                url: finalThumbnail,
              },
              footer: {
                text: `Flipped by ${username}`,
              },
            },
          ],
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: customId,
                  label: buttonLabel,
                  style: buttonStyle,
                  disabled: !isWin,
                },
              ],
            },
          ],
        },
      },
    );
  } catch (err) {
    console.error("Error running coin flip animation:", err);
  }
}

export function handleGambleStopInteraction(req, res) {
  const { type, data } = req.body;
  let responseType;
  let streak = 0;

  if (type === 3) {
    // InteractionType.MESSAGE_COMPONENT
    responseType = InteractionResponseType.UPDATE_MESSAGE;
    const { custom_id } = data;
    const parts = custom_id.split("_");
    streak = parts.length > 3 ? parseInt(parts[3], 10) : 0;
  } else {
    // InteractionType.APPLICATION_COMMAND
    responseType = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE;
  }

  res.send({
    type: responseType,
    data: {
      embeds: [
        {
          title: "🪙 Coin Flip",
          description: `Flipping the coin... Let's see what the fates decide!${
            streak > 0 ? `\n\n🔥 Play Again Streak: **${streak}**` : ""
          }`,
          color: 0x3498db, // blue
          thumbnail: {
            url: "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1fa99.png",
          },
        },
      ],
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              custom_id: "gamble_flip_again_spinning",
              label: "Flipping...",
              style: 2, // SECONDARY
              disabled: true,
            },
          ],
        },
      ],
    },
  });

  runCoinFlip(req, streak);
}
