import {
  InteractionResponseType,
  MessageComponentTypes,
} from "discord-interactions";
import { DiscordRequest } from "../utils.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const COINS = [
  {
    id: "standard",
    label: "Standard",
    emoji: "🪙",
    description: "An even chance to play one more game or stop.",
    // The first flip is guaranteed Heads; replays are genuinely 50/50.
    getHeadsPercent: (flipNumber) => (flipNumber === 0 ? 100 : 50),
    allowsReplay: true,
  },
  {
    id: "lucky",
    label: "Lucky",
    emoji: "🍀",
    description: "A lucky chance to play one more game.",
    // The first flip is guaranteed Heads; replays randomly choose between 60% and 95% Heads.
    getHeadsPercent: (flipNumber) =>
      flipNumber === 0 ? 100 : Math.floor(Math.random() * 36) + 60,
    allowsReplay: true,
  },
  {
    id: "random",
    label: "Random",
    emoji: "🎲",
    description: "The coin chooses its own odds.",
    // Randomly chooses from 0% to 100% Heads.
    getHeadsPercent: () => Math.floor(Math.random() * 101),
    allowsReplay: true,
  },
];

function getUser(req) {
  return req.body.member?.user || req.body.user;
}

function getUsername(req) {
  return getUser(req)?.username || "Gamer";
}

function getCoinButtonId(coin, flipNumber = 0) {
  return `gamble_coin_${coin.id}${coin.allowsReplay ? `_${flipNumber}` : ""}`;
}

function getSetupMessage() {
  return {
    embeds: [
      {
        title: "🪙 Gamble Stop",
        description: [
          "Choose a coin to flip.",
          "",
          ...COINS.map(
            (coin) =>
              `${coin.emoji} **${coin.label}** — ${coin.description}`,
          ),
          "",
          "Keep your streak going by replaying after Heads.",
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
        components: COINS.map((coin) => ({
          type: MessageComponentTypes.BUTTON,
          custom_id: getCoinButtonId(coin),
          label: coin.label,
          style: 1,
          emoji: { name: coin.emoji },
        })),
      },
    ],
  };
}

function getFlipStartedMessage(coin, flipNumber) {
  return {
    embeds: [
      {
        title: "🪙 Coin Flip",
        description: `${coin.emoji} Flipping the **${coin.label}** coin... Let's see what the fates decide!\n\n🔥 Current Streak: **${flipNumber}**`,
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
            custom_id: "gamble_flip_spinning",
            label: "Flipping...",
            style: 2,
            disabled: true,
          },
        ],
      },
    ],
  };
}

async function runCoinFlip(req, coin, headsPercent, flipNumber) {
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
                description: `${coin.emoji} ${frame.text}\nLet's see what the fates decide!\n\n🔥 Current Streak: **${flipNumber}**`,
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
                    custom_id: "gamble_flip_spinning",
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

    let finalTitle, finalDesc, finalColor, finalThumbnail;
    const streak = flipNumber + 1;

    if (isWin) {
      finalTitle = `👑 Play One More Game! (Streak: ${streak})`;
      finalDesc = `### The ${coin.label} coin landed on Heads!\n\n**Keep Playing! 🎰**\n\n🔥 Current Streak: **${streak}**`;
      finalColor = 0x2ecc71; // green
      finalThumbnail =
        "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f451.png"; // crown
    } else {
      finalTitle = "🦅 Stop! No More!";
      finalDesc = `### The ${coin.label} coin landed on Tails!\n\n**Close the game! 😭**\n\n💀 Streak ended at: **${flipNumber}**`;
      finalColor = 0xe74c3c; // red
      finalThumbnail =
        "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f985.png"; // eagle
    }

    const buttons = [];
    if (isWin && coin.allowsReplay) {
      buttons.push({
        custom_id: getCoinButtonId(coin, flipNumber + 1),
        label: `Flip Again (${streak})`,
        style: 3,
        emoji: { name: coin.emoji },
      });
    }
    if (coin.id === "random") {
      buttons.push({
        custom_id: `gamble_reveal_odds_random_${headsPercent}`,
        label: "Reveal odds",
        style: 2,
      });
    }
    const components = buttons.length
      ? [
          {
            type: MessageComponentTypes.ACTION_ROW,
            components: buttons.map((button) => ({
              type: MessageComponentTypes.BUTTON,
              ...button,
            })),
          },
        ]
      : [];

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
          components,
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

  const revealMatch = customId.match(/^gamble_reveal_odds_random_(\d+)$/);
  if (revealMatch) {
    const headsPercent = Number(revealMatch[1]);
    if (headsPercent < 0 || headsPercent > 100) {
      return res.status(400).json({ error: "invalid revealed odds" });
    }

    return res.send({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        components: [
          {
            type: MessageComponentTypes.ACTION_ROW,
            components: [
              {
                type: MessageComponentTypes.BUTTON,
                custom_id: "gamble_reveal_odds_random_revealed",
                label: `Odds: ${headsPercent}% Heads / ${100 - headsPercent}% Tails`,
                style: 2,
                disabled: true,
              },
            ],
          },
        ],
      },
    });
  }

  const coin = COINS.find(
    (candidate) =>
      customId === getCoinButtonId(candidate) ||
      (candidate.allowsReplay &&
        customId.startsWith(`gamble_coin_${candidate.id}_`)),
  );
  if (!coin) {
    return res.status(400).json({ error: "unknown gamble interaction" });
  }

  const flipNumber = coin.allowsReplay
    ? Number(customId.match(/_(\d+)$/)?.[1])
    : 0;
  if (!Number.isInteger(flipNumber) || flipNumber < 0) {
    return res.status(400).json({ error: "invalid gamble state" });
  }

  const headsPercent = coin.getHeadsPercent(flipNumber);
  if (!Number.isInteger(headsPercent) || headsPercent < 0 || headsPercent > 100) {
    return res.status(400).json({ error: "invalid gamble state" });
  }

  res.send({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: getFlipStartedMessage(coin, flipNumber),
  });

  runCoinFlip(req, coin, headsPercent, flipNumber);
}
