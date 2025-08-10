import discord
from discord import app_commands
from discord.ext import commands

class Owner(commands.Cog, name="owner"):
  def __init__(self, bot) -> None:
    self.bot = bot

  # Kevin: 336205421880541186
  # Jake: 245648161727709184
  def is_owner(interaction: discord.Interaction):
    return interaction.user.id == 336205421880541186 or interaction.user.id == 245648161727709184

  @app_commands.command(
    name="ping",
    description="Check the bot's latency."
  )
  async def ping(self, interaction: discord.Interaction):
    latency = round(self.bot.latency * 1000)
    # Always respond to an interaction, either by sending a message or deferring.
    await interaction.response.send_message(f"Pong! Latency is {latency}ms.")

  @app_commands.command(
    name="sync",
    description="Synchonizes the slash commands.",
  )
  @app_commands.describe(scope="The scope of the sync. Can be `global` or `guild`")
  @app_commands.check(is_owner)
  async def sync(self, interaction: discord.Interaction, scope: str) -> None:
    """
    Synchonizes the slash commands.

    :param interaction: The application command interaction object.
    :param scope: The scope of the sync. Can be `global` or `guild`.
    """

    if scope == "global":
      await interaction.client.tree.sync()
      embed = discord.Embed(
        description="Slash commands have been globally synchronized.",
        color=0xBEBEFE,
      )
      await interaction.response.send_message(embed=embed)
      return
    elif scope == "guild":
      interaction.client.tree.copy_global_to(guild=interaction.guild)
      await interaction.client.tree.sync(guild=interaction.guild)
      embed = discord.Embed(
        description="Slash commands have been synchronized in this guild.",
        color=0xBEBEFE,
      )
      await interaction.response.send_message(embed=embed)
      return
    embed = discord.Embed(
      description="The scope must be `global` or `guild`.", color=0xE02B2B
    )
    await interaction.response.send_message(embed=embed)

  @app_commands.command(
    name="unsync",
    description="Unsynchonizes the slash commands.",
  )
  @app_commands.describe(
    scope="The scope of the sync. Can be `global`, `current_guild` or `guild`"
  )
  @app_commands.check(is_owner)
  async def unsync(self, interaction: discord.Interaction, scope: str) -> None:
    """
    Unsynchonizes the slash commands.

    :param interaction: The application command interaction object.
    :param scope: The scope of the sync. Can be `global`, `current_guild` or `guild`.
    """

    if scope == "global":
      interaction.client.tree.clear_commands(guild=None)
      await interaction.client.tree.sync()
      embed = discord.Embed(
        description="Slash commands have been globally unsynchronized.",
        color=0xBEBEFE,
      )
      await interaction.response.send_message(embed=embed)
      return
    elif scope == "guild":
      interaction.client.tree.clear_commands(guild=interaction.guild)
      await interaction.client.tree.sync(guild=interaction.guild)
      embed = discord.Embed(
        description="Slash commands have been unsynchronized in this guild.",
        color=0xBEBEFE,
      )
      await interaction.response.send_message(embed=embed)
      return
    embed = discord.Embed(
      description="The scope must be `global` or `guild`.", color=0xE02B2B
    )
    await interaction.response.send_message(embed=embed)

  @app_commands.command(
    name="load",
    description="Load a cog",
  )
  @app_commands.describe(cog="The name of the cog to load")
  @app_commands.check(is_owner)
  async def load(self, interaction: discord.Interaction, cog: str) -> None:
    """
    The bot will load the given cog.

    :param interaction: The application command interaction object.
    :param cog: The name of the cog to load.
    """
    try:
      await self.bot.load_extension(f"cogs.{cog}")
    except Exception:
      embed = discord.Embed(
        description=f"Could not load the `{cog}` cog.", color=0xE02B2B
      )
      await interaction.response.send_message(embed=embed)
      return
    embed = discord.Embed(
      description=f"Successfully loaded the `{cog}` cog.", color=0xBEBEFE
    )
    await interaction.response.send_message(embed=embed)

  @app_commands.command(
    name="unload",
    description="Unloads a cog.",
  )
  @app_commands.describe(cog="The name of the cog to unload")
  @app_commands.check(is_owner)
  async def unload(self, interaction: discord.Interaction, cog: str) -> None:
    """
    The bot will unload the given cog.

    :param interaction: The application command interaction object.
    :param cog: The name of the cog to unload.
    """
    try:
      await self.bot.unload_extension(f"cogs.{cog}")
    except Exception:
      embed = discord.Embed(
        description=f"Could not unload the `{cog}` cog.", color=0xE02B2B
      )
      await interaction.response.send_message(embed=embed)
      return
    embed = discord.Embed(
      description=f"Successfully unloaded the `{cog}` cog.", color=0xBEBEFE
    )
    await interaction.response.send_message(embed=embed)

  @app_commands.command(
    name="reload",
    description="Reloads a cog.",
  )
  @app_commands.describe(cog="The name of the cog to reload")
  @app_commands.check(is_owner)
  async def reload(self, interaction: discord.Interaction, cog: str) -> None:
    """
    The bot will reload the given cog.

    :param interaction: The application command interaction object.
    :param cog: The name of the cog to reload.
    """
    try:
      await self.bot.reload_extension(f"cogs.{cog}")
    except Exception:
      embed = discord.Embed(
        description=f"Could not reload the `{cog}` cog.", color=0xE02B2B
      )
      await interaction.response.send_message(embed=embed)
      return
    embed = discord.Embed(
      description=f"Successfully reloaded the `{cog}` cog.", color=0xBEBEFE
    )
    await interaction.response.send_message(embed=embed)

  @app_commands.command(
    name="shutdown",
    description="Make the bot shutdown.",
  )
  @app_commands.check(is_owner)
  async def shutdown(self, interaction: discord.Interaction) -> None:
    """
    Shuts down the bot.

    :param interaction: The application command interaction object.
    """
    embed = discord.Embed(description="Shutting down. Bye! :wave:", color=0xBEBEFE)
    await interaction.response.send_message(embed=embed)
    await self.bot.close()

  @app_commands.command(
    name="say",
    description="The bot will say anything you want.",
  )
  @app_commands.describe(message="The message that should be repeated by the bot")
  async def say(self, interaction: discord.Interaction, *, message: str) -> None:
    """
    The bot will say anything you want.

    :param interaction: The application command interaction object.
    :param message: The message that should be repeated by the bot.
    """
    await interaction.response.send_message(message)

  @app_commands.command(
    name="embed",
    description="The bot will say anything you want, but within embeds.",
  )
  @app_commands.describe(message="The message that should be repeated by the bot")
  async def embed(self, interaction: discord.Interaction, *, message: str) -> None:
    """
    The bot will say anything you want, but using embeds.

    :param interaction: The application command interaction object.
    :param message: The message that should be repeated by the bot.
    """
    embed = discord.Embed(description=message, color=0xBEBEFE)
    await interaction.response.send_message(embed=embed)


async def setup(bot) -> None:
  await bot.add_cog(Owner(bot))
