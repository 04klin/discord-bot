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

  # TODO: MAYBE PERSISTANT STORAGE TO HANDLE LONGER REMINDERS
  @app_commands.command(name="remind", description="Reminds the user with a custom message after a set time")
  async def remind(self, interaction: discord.Interaction, message: str, hours: int, minutes: int, seconds: int) -> None:
    """
    Reminds the user with a custom message after a set time

    :param interaction: The application command interaction object.
    :param message: The reminder message
    :param hours: The number of hours to wait
    :param minutes: The number of minutes to wait 
    """

    if hours < 0 or minutes < 0 or seconds < 0:
      await interaction.response.send_message("No negative numbers", ephemeral=True)
      return
    
    total_seconds = hours * 3600 + minutes * 60 + seconds

    if total_seconds <= 0:
      await interaction.response.send_message("Please provide a time greater than zero!", ephemeral=True)
      return

    # First respond to discord, then run remind_helper
    member = interaction.user
    await interaction.response.send_message(f"Reminder set for {member.mention}")
    self.bot.loop.create_task(self.remind_helper(interaction, message, total_seconds))
  
  async def remind_helper(self, interaction: discord.Interaction, message: str, total_seconds: int):
    """
    Helper function for remind

    :param interaction: The application command interaction object.
    :param message: The reminder message
    :param total_seconds: Total amount of seconds to wait
    """
    member = interaction.user
    await asyncio.sleep(total_seconds)
    await interaction.followup.send(f"{member.mention}, here's your reminder: **{message}**")

  @app_commands.command(name="spam", description="Spam a message n <= 5 times")
  async def spam(self, interaction: discord.Interaction, message: str, count: int) -> None:
    """
    Sends a message to the channel up to 5 times.

    :param interaction: The application command interaction object.
    :param message: The message to be spammed.
    :param count: The number of times to spam the message (maximum 5).
    """

    # Defer the interaction, letting us send more than one message. Message stays
    await interaction.response.defer()

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
