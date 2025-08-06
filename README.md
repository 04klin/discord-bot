# discord bot

```py
@app_commands.guilds(discord.Object(id=GUILD_ID)) # Place your guild ID here
```
Use this for development to instantly sync commands.

## How to set up
- ask for .env file

### Docker
```
docker-compose up -d --build
```

## How to add commands
1. Go to /cogs/template.py
2. Use the template to begin writing commands
