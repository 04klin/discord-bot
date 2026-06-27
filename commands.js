import "dotenv/config";
import { capitalize, InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const BULGE_COMMAND = {
  name: "bulge",
  description: "Apply a bulge warp to an image",
  type: 1,
  options: [
    {
      type: 11, // ATTACHMENT
      name: "image",
      description: "The image to warp",
      required: true,
    },
    {
      type: 10, // NUMBER
      name: "strength",
      description:
        "Distortion strength (positive for bulge, negative for pinch)",
      required: false,
      min_value: -1.0,
      max_value: 1.0,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const GAMBLE_STOP = {
  name: "gamble-stop",
  description: "Should I stop now or play one more?",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, BULGE_COMMAND, GAMBLE_STOP];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
