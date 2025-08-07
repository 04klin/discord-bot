import logging
import os
import platform
import random

import discord
from discord.ext import commands, tasks
from discord import app_commands
from dotenv import load_dotenv

load_dotenv()

"""	
Setup bot intents (events restrictions)
For more information about intents, please go to the following websites:
https://discordpy.readthedocs.io/en/latest/intents.html
https://discordpy.readthedocs.io/en/latest/intents.html#privileged-intents


Default Intents:
intents.bans = True
intents.dm_messages = True
intents.dm_reactions = True
intents.dm_typing = True
intents.emojis = True
intents.emojis_and_stickers = True
intents.guild_messages = True
intents.guild_reactions = True
intents.guild_scheduled_events = True
intents.guild_typing = True
intents.guilds = True
intents.integrations = True
intents.invites = True
intents.messages = True # `message_content` is required to get the content of the messages
intents.reactions = True
intents.typing = True
intents.voice_states = True
intents.webhooks = True

Privileged Intents (Needs to be enabled on developer portal of Discord), please use them only if you need them:
intents.members = True
"""

intents = discord.Intents.default()

intents.message_content = True
intents.presences = True

# Setup both of the loggers

class LoggingFormatter(logging.Formatter):
    # Colors
    black = "\x1b[30m"
    red = "\x1b[31m"
    green = "\x1b[32m"
    yellow = "\x1b[33m"
    blue = "\x1b[34m"
    gray = "\x1b[38m"
    # Styles
    reset = "\x1b[0m"
    bold = "\x1b[1m"

    COLORS = {
        logging.DEBUG: gray + bold,
        logging.INFO: blue + bold,
        logging.WARNING: yellow + bold,
        logging.ERROR: red,
        logging.CRITICAL: red + bold,
    }

    def format(self, record):
        log_color = self.COLORS[record.levelno]
        format = "(black){asctime}(reset) (levelcolor){levelname:<8}(reset) (green){name}(reset) {message}"
        format = format.replace("(black)", self.black + self.bold)
        format = format.replace("(reset)", self.reset)
        format = format.replace("(levelcolor)", log_color)
        format = format.replace("(green)", self.green + self.bold)
        formatter = logging.Formatter(format, "%Y-%m-%d %H:%M:%S", style="{")
        return formatter.format(record)


logger = logging.getLogger("discord_bot")
logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(LoggingFormatter())
# File handler
file_handler = logging.FileHandler(filename="discord.log", encoding="utf-8", mode="w")
file_handler_formatter = logging.Formatter(
    "[{asctime}] [{levelname:<8}] {name}: {message}", "%Y-%m-%d %H:%M:%S", style="{"
)
file_handler.setFormatter(file_handler_formatter)

# Add the handlers
logger.addHandler(console_handler)
logger.addHandler(file_handler)

class DiscordBot(commands.Bot):
    def __init__(self) -> None:
        super().__init__(
            command_prefix=None,
            intents=intents,
            help_command=None,
        )
        """
        This creates custom bot variables so that we can access these variables in cogs more easily.

        For example, The logger is available using the following code:
        - self.logger # In this class
        - bot.logger # In this file
        - self.bot.logger # In cogs
        """
        self.logger = logger

    async def load_cogs(self) -> None:
        """
        The code in this function is executed whenever the bot will start.
        """
        for file in os.listdir(f"{os.path.realpath(os.path.dirname(__file__))}/cogs"):
            if file.endswith(".py"):
                extension = file[:-3]
                try:
                    await self.load_extension(f"cogs.{extension}")
                    self.logger.info(f"Loaded extension '{extension}'")
                except Exception as e:
                    exception = f"{type(e).__name__}: {e}"
                    self.logger.error(
                        f"Failed to load extension {extension}\n{exception}"
                    )

    @tasks.loop(minutes=1.0)
    async def status_task(self) -> None:
        """
        Setup the game status task of the bot.
        """
        statuses = ["my balls", "sdiybt", "sybau"]
        await self.change_presence(activity=discord.Game(random.choice(statuses)))

    @status_task.before_loop
    async def before_status_task(self) -> None:
        """
        Before starting the status changing task, we make sure the bot is ready
        """
        await self.wait_until_ready()

    async def setup_hook(self) -> None:
        """
        This will just be executed when the bot starts the first time.
        """
        self.logger.info(f"Logged in as {self.user.name}")
        self.logger.info(f"discord.py API version: {discord.__version__}")
        self.logger.info(f"Python version: {platform.python_version()}")
        self.logger.info(
            f"Running on: {platform.system()} {platform.release()} ({os.name})"
        )
        self.logger.info("-------------------")

        await self.load_cogs()

        @self.tree.error
        async def on_app_command_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
            """
            The code in this event is executed every time a normal valid command catches an error.

            :param context: The context of the normal command that failed executing.
            :param error: The error that has been faced.
            """
            if isinstance(error, app_commands.CommandOnCooldown):
                minutes, seconds = divmod(error.retry_after, 60)
                hours, minutes = divmod(minutes, 60)
                hours = hours % 24
                embed = discord.Embed(
                    description=f"**Please slow down** - You can use this command again in {f'{round(hours)} hours' if round(hours) > 0 else ''} {f'{round(minutes)} minutes' if round(minutes) > 0 else ''} {f'{round(seconds)} seconds' if round(seconds) > 0 else ''}.",
                    color=0xE02B2B,
                )
                await interaction.response.send_message(embed=embed)
            elif isinstance(error, app_commands.NotOwner):
                embed = discord.Embed(
                    description="You are not the owner of the bot!", color=0xE02B2B
                )
                await interaction.response.send_message(embed=embed)
                if interaction.guild:
                    self.logger.warning(
                        f"{interaction.user} (ID: {interaction.user.id}) tried to execute an owner only command in the guild {interaction.guild.name} (ID: {interaction.guild.id}), but the user is not an owner of the bot."
                    )
                else:
                    self.logger.warning(
                        f"{interaction.user} (ID: {interaction.user.id}) tried to execute an owner only command in the bot's DMs, but the user is not an owner of the bot."
                    )
            elif isinstance(error, app_commands.MissingPermissions):
                embed = discord.Embed(
                    description="You are missing the permission(s) `"
                    + ", ".join(error.missing_permissions)
                    + "` to execute this command!",
                    color=0xE02B2B,
                )
                await interaction.response.send_message(embed=embed)
            elif isinstance(error, app_commands.BotMissingPermissions):
                embed = discord.Embed(
                    description="I am missing the permission(s) `"
                    + ", ".join(error.missing_permissions)
                    + "` to fully perform this command!",
                    color=0xE02B2B,
                )
                await interaction.response.send_message(embed=embed)
            else:
                # Log any other errors
                self.logger.error(f"Unhandled command error: {error}")
                # Optionally, send a generic error message to the user
                embed = discord.Embed(
                    description="An unexpected error occurred. Please try again later.",
                    color=0xE02B2B
                )
                # Check if we've already responded to the interaction
                if interaction.response.is_done():
                    await interaction.followup.send(embed=embed, ephemeral=True)
                else:
                    await interaction.response.send_message(embed=embed, ephemeral=True)

        # Load cogs before syncing
        guild = discord.Object(id=244842516631781386)

        self.tree.copy_global_to(guild=guild)
        await self.tree.sync(guild=guild) 

        # await self.tree.sync()
        self.status_task.start()
    
    # Prevents the bot from processing non-slash commands, otherwise, errors appear
    async def on_message(self, message: discord.Message) -> None:
        """
        This prevents the bot from processing commands from regular messages.
        We are using slash commands only, so we don't want this behavior.
        """
        # If the message is from the bot itself, ignore it.
        if message.author.bot:
            return

    async def on_interaction(self, interaction: discord.Interaction) -> None:
        """
        The code in this event is executed every time a normal command has been *successfully* executed.

        :param interaction: The interaction that has been executed.
        """
        if hasattr(interaction, "command") and interaction.command is not None:
            full_command_name = interaction.command.qualified_name
            split = full_command_name.split(" ")
            executed_command = str(split[0])
            if interaction.guild is not None:
                self.logger.info(
                    f"Executed {executed_command} command in {interaction.guild.name} (ID: {interaction.guild.id}) by {interaction.user} (ID: {interaction.user.id})"
                )
            else:
                self.logger.info(
                    f"Executed {executed_command} command by {interaction.user} (ID: {interaction.user.id}) in DMs"
                )

bot = DiscordBot()
bot.run(os.getenv("TOKEN"))
