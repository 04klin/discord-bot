import "dotenv/config";
import express from "express";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from "discord-interactions";
import { getRandomEmoji, DiscordRequest } from "./utils.js";
import { handleBulgeInteraction } from "./image-transformation/bulge.js";
import { handleGambleStopInteraction } from "./gamble-stop/gamble-stop-logic.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
    // Interaction id, type and data
    const { id, type, data } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data;

      // "test" command
      if (name === "test") {
        // Send a message into the channel where command was triggered from
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                // Fetches a random emoji to send from a helper function
                content: `I'm a chud ${getRandomEmoji()}, I'm a chud ${getRandomEmoji()}, I'm a fat little chud ${getRandomEmoji()}\n
Playing League all day until the sun comes up ${getRandomEmoji()}`,
              },
            ],
          },
        });
      }

      if (name === "gamble-stop") {
        handleGambleStopInteraction(req, res);
        return;
      }

      if (name === "bulge") {
        handleBulgeInteraction(req, res);
        return;
      }

      console.error(`unknown command: ${name}`);
      return res.status(400).json({ error: "unknown command" });
    }

    /**
     * Handle message component (button, select menu) requests
     */
    if (type === InteractionType.MESSAGE_COMPONENT) {
      const { custom_id } = data;

      if (custom_id && custom_id.startsWith("gamble_flip_again")) {
        handleGambleStopInteraction(req, res);
        return;
      }
    }

    console.error("unknown interaction type", type);
    return res.status(400).json({ error: "unknown interaction type" });
  },
);

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
