import {
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { DiscordRequest } from "../utils.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_HEADS_PERCENT = 85;
const ODDS_STEP = 5;

function getUser(req) {
  return req.body.member?.user || req.body.user;
}

function getUsername(req) {
  return getUser(req)?.username || "Gamer";
}

function getOddsOptions(selectedHeadsPercent) {
  return Array.from({ length: 21 }, (_, index) => {
    const headsPercent = index * ODDS_STEP;
    return {
      label: `Heads ${headsPercent}% / Tails ${100 - headsPercent}%`,
      value: String(headsPercent),
      description:
        headsPercent >= 50
          ? "More likely to play one more"
          : "More likely to stop",
      default: headsPercent === selectedHeadsPercent,
    };
  });
}

function getSetupMessage(headsPercent = DEFAULT_HEADS_PERCENT, hasSelectedOdds = false) {
  const tailsPercent = 100 - headsPercent;

  return {
    embeds: [
      {
        title: "🪙 Gamble Stop",
        description: [
          "Set the coin odds, then flip it.",
          `**Heads: ${headsPercent}%** (play one more)`,
          `**Tails: ${tailsPercent}%** (stop)`,
          "",
          hasSelectedOdds
            ? "Your odds are set. Flip when you are ready!"
            : "Use the odds slider before your first flip.",
        ].join("\n"),
        color: 0x3498db,
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
            type: MessageComponentTypes.STRING_SELECT,
            custom_id: "gamble_odds",
            placeholder: "Set heads / tails odds",
            min_values: 1,
            max_values: 1,
            options: getOddsOptions(headsPercent),
          },
        ],
      },
      {
        type: MessageComponentTypes.ACTION_ROW,
        components: [
          {
            type: MessageComponentTypes.BUTTON,
            custom_id: `gamble_flip_${headsPercent}_0`,
            label: "Flip Coin",
            style: 1,
            disabled: !hasSelectedOdds,
          },
        ],
      },
    ],
  };
}

function getFlipStartedMessage(streak) {
  return {
    embeds: [
      {
        title: "🪙 Coin Flip",
        description: `Flipping the coin... Let's see what the fates decide!${
          streak > 0 ? `\n\n🔥 Play Again Streak: **${streak}**` : ""
        }`,
        color: 0x3498db,
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
            style: 2,
            disabled: true,
          },
        ],
      },
    ],
  };
}

async function runCoinFlip(req, streak = 0, headsPercent = DEFAULT_HEADS_PERCENT) {
  try {
    const { token } = req.body;
    const applicationId = req.body.application_id || process.env.APP_ID;
    const username = getUsername(req);

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
    const isWin = Math.random() < headsPercent / 100;

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
      finalDesc = `### The coin landed on Heads!\n\n**Keep Playing! 🎰**\n\n🔥 Current Streak: **${newStreak}**`;
      finalColor = 0x2ecc71; // green
      finalThumbnail =
        "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f451.png"; // crown
      buttonLabel = "Flip Again?";
      buttonStyle = 3; // SUCCESS
      customId = `gamble_flip_again_${headsPercent}_${newStreak}`;
    } else {
      finalTitle = "🦅 Stop! No More!";
      finalDesc = `### The coin landed on Tails!\n\n**Close the game! 😭**\n\n💀 Streak ended at: **${streak}**`;
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
  if (type !== 3) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: getSetupMessage(),
    });
  }

  const customId = data.custom_id;

  if (customId === "gamble_odds") {
    const headsPercent = Number(data.values?.[0]);
    if (!Number.isInteger(headsPercent) || headsPercent < 0 || headsPercent > 100) {
      return res.status(400).json({ error: "invalid odds selection" });
    }

    return res.send({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: getSetupMessage(headsPercent, true),
    });
  }

  const flipMatch = customId.match(/^gamble_(?:flip|flip_again)_(\d+)_(\d+)$/);
  if (!flipMatch) {
    return res.status(400).json({ error: "unknown gamble interaction" });
  }

  const headsPercent = Number(flipMatch[1]);
  const streak = Number(flipMatch[2]);
  if (
    !Number.isInteger(headsPercent) ||
    headsPercent < 0 ||
    headsPercent > 100 ||
    !Number.isInteger(streak) ||
    streak < 0
  ) {
    return res.status(400).json({ error: "invalid gamble state" });
  }

  res.send({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: getFlipStartedMessage(streak),
  });

  runCoinFlip(req, streak, headsPercent);
}
