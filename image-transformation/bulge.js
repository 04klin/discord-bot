import { Jimp } from "jimp";
import { InteractionResponseType } from "discord-interactions";

/**
 * Apply a bulge/pinch warp to an image buffer.
 * @param {Buffer} imageBuffer - Input image binary data.
 * @param {number} strength - Distortion strength (-1.0 to 1.0).
 * @returns {Promise<Buffer>} - Processed image PNG buffer.
 */
export async function applyBulgeWarp(imageBuffer, strength = 0.5) {
  // Read the image
  const image = await Jimp.read(imageBuffer);
  const { width, height } = image.bitmap;

  // Create a blank canvas to write the warped pixels into
  const output = new Jimp({ width, height, color: 0x00000000 });

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) / 2;

  // Perform backward mapping: for each destination pixel (xd, yd),
  // find the corresponding source pixel (xs, ys).
  for (let yd = 0; yd < height; yd++) {
    for (let xd = 0; xd < width; xd++) {
      const dx = xd - cx;
      const dy = yd - cy;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r < maxR && r > 0) {
        const rn = r / maxR;
        // scale formula:
        // For strength > 0: rn_new < rn => scale < 1.0 => xs, ys closer to center => bulge (magnify center)
        // For strength < 0: rn_new > rn => scale > 1.0 => xs, ys further from center => pinch (shrink center)
        const scale = 1.0 - strength * (1.0 - rn);

        const xs = cx + dx * scale;
        const ys = cy + dy * scale;

        // Perform bilinear interpolation to get smooth color
        const color = getBilinearPixel(image, xs, ys);
        output.setPixelColor(color, xd, yd);
      } else {
        // Outside the radius or at the exact center, keep pixel as-is
        const color = image.getPixelColor(xd, yd);
        output.setPixelColor(color, xd, yd);
      }
    }
  }

  // Get the buffer of the output image in PNG format
  return await output.getBuffer("image/png");
}

/**
 * Get color at coordinates using bilinear interpolation.
 * @param {Jimp} img - Jimp image instance.
 * @param {number} x - Source x coordinate.
 * @param {number} y - Source y coordinate.
 * @returns {number} - Packed RGBA color value.
 */
function getBilinearPixel(img, x, y) {
  const { width, height } = img.bitmap;

  let x0 = Math.floor(x);
  let x1 = x0 + 1;
  let y0 = Math.floor(y);
  let y1 = y0 + 1;

  // Clamp coordinates
  x0 = Math.max(0, Math.min(width - 1, x0));
  x1 = Math.max(0, Math.min(width - 1, x1));
  y0 = Math.max(0, Math.min(height - 1, y0));
  y1 = Math.max(0, Math.min(height - 1, y1));

  const tx = x - x0;
  const ty = y - y0;

  // Get colors at the 4 surrounding pixels
  const c00 = intToRgba(img.getPixelColor(x0, y0));
  const c10 = intToRgba(img.getPixelColor(x1, y0));
  const c01 = intToRgba(img.getPixelColor(x0, y1));
  const c11 = intToRgba(img.getPixelColor(x1, y1));

  // Interpolate channels
  const r = interpolate(c00.r, c10.r, c01.r, c11.r, tx, ty);
  const g = interpolate(c00.g, c10.g, c01.g, c11.g, tx, ty);
  const b = interpolate(c00.b, c10.b, c01.b, c11.b, tx, ty);
  const a = interpolate(c00.a, c10.a, c01.a, c11.a, tx, ty);

  // Return packed integer color
  return rgbaToInt(Math.round(r), Math.round(g), Math.round(b), Math.round(a));
}

function interpolate(c00, c10, c01, c11, tx, ty) {
  return (
    c00 * (1 - tx) * (1 - ty) +
    c10 * tx * (1 - ty) +
    c01 * (1 - tx) * ty +
    c11 * tx * ty
  );
}

function intToRgba(val) {
  return {
    r: (val >>> 24) & 0xff,
    g: (val >>> 16) & 0xff,
    b: (val >>> 8) & 0xff,
    a: val & 0xff,
  };
}

function rgbaToInt(r, g, b, a) {
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/**
 * Handle the bulge interaction request.
 */
export async function handleBulgeInteraction(req, res) {
  const { data } = req.body;
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
}

