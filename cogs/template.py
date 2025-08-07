import discord
from discord.ext import commands
from discord import app_commands

# Here we name the cog and create a new class for the cog.
class Template(commands.Cog, name="template"):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="testcommand",
        description="This is a testing command that does nothing.",
    )
    async def testcommand(self, interaction: discord.Interaction) -> None:
        """
        This is a slash command that does nothing.

        :param interaction: The application command interaction.
        """
        # To respond to a slash command, you must use interaction.response.send_message.
        # This sends a message back to the channel.
        # `ephemeral=True` makes the response visible only to the user who used the command.
        await interaction.response.send_message("This slash command works!", ephemeral=True)


# And then we finally add the cog to the bot so that it can load, unload, reload and use it's content.
# Adding the bot parameter type here is also good practice.
async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Template(bot))
