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
import { applyBulgeWarp } from "./image-transformation/bulge.js";
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
        const imageOption = data.options?.find((opt) => opt.name === "image");
        const strengthOption = data.options?.find(
          (opt) => opt.name === "strength",
        );

        if (!imageOption) {
          return res
            .status(400)
            .json({ error: "Missing required image parameter" });
        }

        const attachmentId = imageOption.value;
        const attachment = data.resolved?.attachments?.[attachmentId];

        if (!attachment) {
          return res
            .status(400)
            .json({ error: "Could not resolve image attachment" });
        }

        const imageUrl = attachment.url;
        const strength = strengthOption ? strengthOption.value : 0.5;

        // Respond with deferred channel message with source (type 5)
        res.send({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        });

        // Run the image download and processing in the background asynchronously
        (async () => {
          try {
            // 1. Fetch image
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(
                `Failed to download image from Discord: ${response.statusText}`,
              );
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 2. Warp image
            const warpedBuffer = await applyBulgeWarp(buffer, strength);

            // 3. Send follow-up message
            const token = req.body.token;
            const applicationId = req.body.application_id || process.env.APP_ID;

            const formData = new FormData();
            formData.append(
              "payload_json",
              JSON.stringify({
                content: `Here's your image at ${strength}) strength`,
              }),
            );
            formData.append(
              "files[0]",
              new Blob([warpedBuffer], { type: "image/png" }),
              "warped.png",
            );

            const followUpUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${token}`;
            const followUpResponse = await fetch(followUpUrl, {
              method: "POST",
              body: formData,
            });

            if (!followUpResponse.ok) {
              const errorText = await followUpResponse.text();
              console.error("Failed to send follow-up message:", errorText);
            }
          } catch (err) {
            console.error("Error processing bulge warp:", err);
            try {
              const token = req.body.token;
              const applicationId =
                req.body.application_id || process.env.APP_ID;
              await fetch(
                `https://discord.com/api/v10/webhooks/${applicationId}/${token}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    content: `Failed to warp image: ${err.message}`,
                  }),
                },
              );
            } catch (innerErr) {
              console.error("Failed to send error notification:", innerErr);
            }
          }
        })();

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
