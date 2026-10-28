# Getting Started app for Discord

This project contains a basic rock-paper-scissors-style Discord app written in JavaScript, built for the [getting started guide](https://discord.com/developers/docs/getting-started).

![Demo of app](https://github.com/discord/discord-example-app/raw/main/assets/getting-started-demo.gif?raw=true)

## Project structure
Below is a basic overview of the project structure:

```
├── examples    -> short, feature-specific sample apps
│   ├── app.js  -> finished app.js code
│   ├── button.js
│   ├── command.js
│   ├── modal.js
│   ├── selectMenu.js
├── .env.sample -> sample .env file
├── app.js      -> main entrypoint for app
├── commands.js -> slash command payloads + helpers
├── game.js     -> logic specific to RPS
├── utils.js    -> utility functions and enums
├── package.json
├── README.md
└── .gitignore
```

## Running app locally

Before you start, you'll need to install [NodeJS](https://nodejs.org/en/download/) and [create a Discord app](https://discord.com/developers/applications) with the proper permissions:
- `applications.commands`
- `bot` (with Send Messages enabled)


Configuring the app is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

### Setup project

First clone the project:
```
git clone https://github.com/discord/discord-example-app.git
```

Then navigate to its directory and install dependencies:
```
cd discord-example-app
npm install
```
### Get app credentials

Fetch the credentials from your app's settings and add them to a `.env` file (see `.env.sample` for an example). You'll need your app ID (`APP_ID`), bot token (`DISCORD_TOKEN`), and public key (`PUBLIC_KEY`).

Fetching credentials is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

> 🔑 Environment variables can be added to the `.env` file in Glitch or when developing locally, and in the Secrets tab in Replit (the lock icon on the left).

### Install slash commands

The commands for the example app are set up in `commands.js`. All of the commands in the `ALL_COMMANDS` array at the bottom of `commands.js` will be installed when you run the `register` command configured in `package.json`:

```
npm run register
```

### Run the app

After your credentials are added, go ahead and run the app:

```
node app.js
```

> ⚙️ A package [like `nodemon`](https://github.com/remy/nodemon), which watches for local changes and restarts your app, may be helpful while locally developing.

If you aren't following the [getting started guide](https://discord.com/developers/docs/getting-started), you can move the contents of `examples/app.js` (the finished `app.js` file) to the top-level `app.js`.

## Running with Docker

The container packages the bot and its production dependencies so it can run
without a local Node.js installation. Make sure Podman and Podman Compose are
installed, then create the environment file:

```
cp .env.sample .env
```

For local Node.js development, fill in `APP_ID`, `DISCORD_TOKEN`, and
`PUBLIC_KEY` in `.env`. For the container, create a native Podman secret from the external credentials
file. The file is not copied into the workspace:

```
podman secret create discordbot-env /home/lobster/.secrets/.discordbot-env
```

Start the container and tunnel with:

```
./setup.sh
```

Add `--build` when the image needs to be rebuilt:

```
./setup.sh --build
```

To rebuild and run only the container without starting ngrok:

```
./setup.sh --container
```

Both `--build` and `--container` stop and replace the existing `discord-bot`
container first. The default `./setup.sh` reuses the existing image, replaces
the container, and starts ngrok.

The interactions endpoint is available at `http://localhost:3005/interactions`. View logs with:

```
podman logs -f discord-bot
```

To stop the container:

```
podman stop discord-bot
```

Register or update the slash commands from the image:

```
podman run --rm --secret "discordbot-env,type=mount,target=/run/secrets/discordbot-env,uid=1000,gid=1000,mode=0400" discord-bot npm run register
```

Discord must be able to reach the interactions endpoint over HTTPS. For local development, expose port 3005 through a tunnel such as ngrok; for production, put the container behind a reverse proxy or load balancer that provides HTTPS.

### Set up interactivity

The project needs a public endpoint where Discord can send requests. To develop and test locally, you can use something like [`ngrok`](https://ngrok.com/) to tunnel HTTP traffic.

Install ngrok if you haven't already. Run `./setup.sh`; it starts the
container and an ngrok tunnel to the host's published port (`3005` by default):

```
./setup.sh
```

If you want a different host-side port, use the same value when starting the
script, for example `PORT=8080 ./setup.sh`.

To rotate credentials, replace the external secret by running:

```
podman secret rm discordbot-env
podman secret create discordbot-env /home/lobster/.secrets/.discordbot-env
podman restart discord-bot
```

You should see your connection open:

```
Tunnel Status                 online
Version                       2.0/2.0
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://1234-someurl.ngrok.io -> localhost:3005

Connections                  ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

Copy the forwarding address that starts with `https`, in this case `https://1234-someurl.ngrok.io`, then go to your [app's settings](https://discord.com/developers/applications).

On the **General Information** tab, there will be an **Interactions Endpoint URL**. Paste your ngrok address there, and append `/interactions` to it (`https://1234-someurl.ngrok.io/interactions` in the example).

Click **Save Changes**, and your app should be ready to run 🚀

## Other resources
- Read **[the documentation](https://discord.com/developers/docs/intro)** for in-depth information about API features.
- Browse the `examples/` folder in this project for smaller, feature-specific code examples
- Join the **[Discord Developers server](https://discord.gg/discord-developers)** to ask questions about the API, attend events hosted by the Discord API team, and interact with other devs.
- Check out **[community resources](https://discord.com/developers/docs/topics/community-resources#community-resources)** for language-specific tools maintained by community members.
