# Smeid - Subject Matter Expert (SME) Identifier (ID)

A Discord bot system that uses Ollama for local LLM inference to create AI-powered personas that interact naturally in Discord channels. Smeid intelligently routes conversations to the appropriate subject matter expert (Ada Lovelace, Einstein, or Snarf) based on the context and content of messages.

## Features

- **Multiple AI Personas**: Create and manage different AI characters with unique personalities and knowledge domains
- **Local LLM Processing**: Uses Ollama for private, local AI inference
- **Intelligent Routing**: Smeid bot automatically identifies which expert persona should respond to messages
- **Conversation History**: Maintains chat history with automatic YAML/JSON backups
- **Smart Triggers**: Responds when mentioned, in specific channels, or based on channel topics
- **Cooldown Management**: Prevents spam with configurable cooldowns
- **Channel-Specific Behavior**: Different personas can be assigned to specific channels

## Prerequisites

- Node.js (v14 or higher)
- [Ollama](https://ollama.ai/) installed and running locally
- Discord Bot Token (from [Discord Developer Portal](https://discord.com/developers/applications))
- At least one Ollama model downloaded (e.g., `gemma3:27b`, `llama3.2`)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd discord_bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure your bot personas (see Configuration section below)

## Configuration

Each bot persona requires two configuration files:

### 1. JSON Configuration File (`<botname>.json`)

Example structure for `ada_lovelace.json`:
```json
{
  "name": "Ada Lovelace",
  "id": "YOUR_BOT_USER_ID",
  "alias": "Ada",
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "channels": {
    "channel-name": "CHANNEL_ID",
    "another-channel": "ANOTHER_CHANNEL_ID"
  }
}
```

#### Getting Configuration Values

1. **Discord Application ID** (`YOUR_BOT_USER_ID`):
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Copy the "Application ID" from the General Information page
   - This is your bot's user ID

2. **Discord Bot Token** (`YOUR_DISCORD_BOT_TOKEN`):
   - In the same application, go to the "Bot" section
   - Click "Reset Token" or "Copy" to get your bot token
   - **Important**: Keep this token secret and never commit it to version control

3. **Channel IDs** (`CHANNEL_ID`, `CHANNEL_ID_1`, etc.):
   - In Discord, enable Developer Mode (User Settings > Advanced > Developer Mode)
   - Right-click on any channel and select "Copy Channel ID"
   - Add each channel you want the bot to monitor with its name and ID

### 2. YAML Persona File (`<botname>.yaml`)

Defines the persona's personality and behavior. Example:
```yaml
- role: user
  content: |
    Pretend to be Ada Lovelace.
    [Personality instructions and context...]

- role: assistant
  content: |
    Okay, I'll be sure to always put my response as Ada Lovelace here.
    ```txt
    ```
```

## Usage

### Running Individual Personas

```bash
# Run Ada Lovelace bot
node smeid.mjs "Ada Lovelace"

# Run Einstein bot with custom interval (in milliseconds)
node smeid.mjs "Einstein" 300000

# Run Snarf bot
node smeid.mjs "Snarf"
```

### Running the Smeid Router Bot

Smeid acts as an intelligent router that determines which expert should respond:

```bash
# Run with default 5-minute interval
node smeid.mjs

# Run with custom interval
node smeid.mjs "Smeid" 60000
```

## Available Personas

- **Ada Lovelace**: Historical computer science pioneer, knowledgeable about mathematics and early computing
- **Einstein**: Physics and general science expert
- **Snarf** (Sentient Neural Algorithmic Response Framework): Guide for Monkey's Wrench makerspace and AI Innovators of Huntsville
- **Smeid**: Subject-matter-expert identifier that routes conversations to appropriate personas

## How It Works

### Message Flow

1. Bot monitors configured Discord channels
2. When a message is detected (mention, channel-specific trigger, or interval check), it:
   - Fetches recent message history (up to 1000 messages)
   - Sends context to the configured Ollama model
   - Receives AI-generated response
   - Posts response in the channel
3. Conversation history is automatically backed up to `bak/` directory

### Triggering Responses

Bots will respond when:
- Explicitly mentioned (@botname)
- In a channel whose name matches their alias
- Channel topic includes "bots get a say"
- On regular intervals (configurable, default 5 minutes)

### Response Length Variation

To maintain natural conversation, responses are randomly limited to:
- 21 words or less (25% chance)
- 13 words or less (25% chance)
- 8 words or less (25% chance)
- Up to 1 paragraph (25% chance)

## Project Structure

```
discord_bot/
├── smeid.mjs                    # Main Smeid router bot
├── smeid-lib.mjs                # Core Discord bot library
├── persona.mjs                  # Conversation history manager
├── ollama-kid.mjs               # Ollama chat interface
├── transform.mjs                # Utility functions
├── *.json                       # Bot configuration files
├── *.yaml                       # Persona definitions
├── channel_messages/            # Channel message logs
├── bak/                         # Conversation backups
└── package.json                 # Node dependencies
```

## Dependencies

- `discord.js`: Discord API wrapper
- `ollama`: Ollama JavaScript client
- `axios`: HTTP client
- `js-yaml`: YAML parser

## Deployment

The repository includes deployment scripts:

```bash
# Deploy the bot
./deploy.sh

# Pull latest changes
./pull.sh
```

## Advanced Configuration

### Custom Model Selection

Edit `persona.mjs` line 7 to change the default model:
```javascript
const model = "gemma3:27b"; // Change to your preferred model
```

### Adjusting Intervals

Default check interval is 5 minutes. Modify in `smeid-lib.mjs` line 9:
```javascript
const INTERVAL_MS = 5 * 60 * 1000; // Adjust as needed
```

### Cooldown Period

Message cooldown is 15 seconds by default. Change in `smeid-lib.mjs` line 162:
```javascript
const COOLDOWN_MS = 15 * 1000; // Adjust as needed
```

## Troubleshooting

### Bot Not Responding

1. Check that Ollama is running: `ollama list`
2. Verify bot token is valid in the `.json` configuration
3. Ensure bot has proper Discord permissions (Read Messages, Send Messages, Read Message History)
4. Check channel IDs are correct in configuration

### Lock File Issues

If you see "already running" errors, remove stale lock files:
```bash
rm *.lock
```

### Model Not Found

Download the required model:
```bash
ollama pull gemma3:27b
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes with the appropriate bot persona
5. Submit a pull request

## License

ISC

## Acknowledgments

Built for AI Innovators of Huntsville and Monkey's Wrench makerspace community.
