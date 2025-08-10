import random
import asyncio


import aiohttp
import discord
from discord.ext import commands
from discord import app_commands

class Choice(discord.ui.View):
  def __init__(self) -> None:
    super().__init__()
    self.value = None

  @discord.ui.button(label="Heads", style=discord.ButtonStyle.blurple)
  async def confirm(
    self, interaction: discord.Interaction, button: discord.ui.Button
  ) -> None:
    self.value = "heads"
    self.stop()

  @discord.ui.button(label="Tails", style=discord.ButtonStyle.blurple)
  async def cancel(
    self, interaction: discord.Interaction, button: discord.ui.Button
  ) -> None:
    self.value = "tails"
    self.stop()

class Fun(commands.Cog, name="fun"):
  def __init__(self, bot) -> None:
    self.bot = bot
  
  @app_commands.command(name="spam", description="Spam a message n <= 5 times")
  async def spam(self, interaction: discord.Interaction, message: str, count: int) -> None:
    """
    Sends a message to the channel up to 5 times.

    :param interaction: The application command interaction object.
    :param message: The message to be spammed.
    :param count: The number of times to spam the message (maximum 5).
    """

    # Defer the interaction, letting us send more than one message. Message stays
    await interaction.response.defer(ephemeral=False)

    if count > 5:
      count = 5

    for _ in range(count):
      await interaction.channel.send(message)
      await asyncio.sleep(0.1)

    await interaction.followup.send(f"✅ Finished spamming '{message}' {count} times.")

  @app_commands.command(name="hello", description="Hello")
  async def hello(self, interaction: discord.Interaction) -> None:
    """
    A slash command that responds with an embed saying "Hello"

    :param interaction: The application command interaction object.
    """
    embed = discord.Embed(description="Hello", color=0xBEBEFE)
    await interaction.response.send_message(embed=embed)

  @app_commands.command(name="randomfact", description="Get a random fact.")
  async def randomfact(self, interaction: discord.Interaction) -> None:
    """
    Get a random fact.

    :param interaction: The application command interaction object.
    """
    # This will prevent your bot from stopping everything when doing a web request - see: https://discordpy.readthedocs.io/en/stable/faq.html#how-do-i-make-a-web-request
    async with aiohttp.ClientSession() as session:
      async with session.get(
        "https://uselessfacts.jsph.pl/random.json?language=en"
      ) as request:
        if request.status == 200:
          data = await request.json()
          embed = discord.Embed(description=data["text"], color=0xD75BF4)
        else:
          embed = discord.Embed(
            title="Error!",
            description="There is something wrong with the API, please try again later",
            color=0xE02B2B,
          )
        await interaction.response.send_message(embed=embed)

  @app_commands.command(
    name="coinflip", description="Make a coin flip, but give your bet before."
  )
  async def coinflip(self, interaction: discord.Interaction) -> None:
    """
    Make a coin flip, but give your bet before.

    :param interaction: The application command interaction object.
    """
    buttons = Choice()
    embed = discord.Embed(description="What is your bet?", color=0xBEBEFE)
    await interaction.response.send_message(embed=embed, view=buttons)
    await buttons.wait()  # We wait for the user to click a button.
    result = random.choice(["heads", "tails"])
    if buttons.value == result:
      embed = discord.Embed(
        description=f"Correct! You guessed `{buttons.value}` and I flipped the coin to `{result}`.",
        color=0xBEBEFE,
      )
    else:
      embed = discord.Embed(
        description=f"Woops! You guessed `{buttons.value}` and I flipped the coin to `{result}`, better luck next time!",
        color=0xE02B2B,
      )
    initial_message = await interaction.original_response()
    await initial_message.edit(embed=embed, view=None)

async def setup(bot) -> None:
  await bot.add_cog(Fun(bot))
