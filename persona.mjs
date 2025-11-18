import ollamaKid from "./ollama-kid.mjs";
import fs from 'fs/promises'; // Use fs.promises for async file operations
import fsSync from 'fs'; // Import the synchronous version for directory checks
import yaml from 'js-yaml';
import crypto from 'crypto';

const model = "gemma3:27b"; // Or any model you prefer
const defaultHistoryFile = process.argv[2] || 'message_history.yaml';
const backupDir = 'bak';

// Get history file path from command-line arguments or use the default
let historyFile = defaultHistoryFile;

let messageHistory = [];

async function setHistoryFile(filename) {
    historyFile = filename;
    console.log(`Using history file: ${historyFile}`);
}

async function getHistoryFile() {
    return historyFile;
}

// Ensure the backup directory exists
async function ensureBackupDirExists() {
    if (!fsSync.existsSync(backupDir)) {
        await fs.mkdir(backupDir, { recursive: true });
        console.log(`Created backup directory: ${backupDir}`);
    }
}

// Load History Function (YAML)
async function loadHistory() {
    try {
        if (fsSync.existsSync(historyFile)) {
            const data = await fs.readFile(historyFile, 'utf8');
            try {
                messageHistory = yaml.load(data) || []; // Ensure it's an array even if file is empty
                console.log(`Loaded history with ${messageHistory.length} messages.`);
            } catch (e) {
                console.error("Error parsing YAML:", e);
                console.error("Attempting to load as JSON");
                try {
                    messageHistory = JSON.parse(data) || [];
                    console.log(`Loaded history with ${messageHistory.length} messages.`);
                } catch (e) {
                    console.error("Error parsing JSON:", e);
                    console.error("History file is corrupt. Starting with an empty history.");
                    messageHistory = [];
                }
            }
        } else {
            console.log("No history file found. Starting with an empty history.");
            messageHistory = []; // Initialize as an empty array if the file doesn't exist
        }
    } catch (error) {
        console.error("Error loading hstory:", error);
        messageHistory = [];
    }
}

// Save History Function (YAML)
async function saveHistory() {
    try {
        const yamlString = yaml.dump(messageHistory, { indent: 2 }); // Added indent for readability
        await fs.writeFile(historyFile, yamlString);
        console.log(`Saved history with ${messageHistory.length} messages.`);
    } catch (error) {
        console.error("Error saving history:", error);
    }
}

// Add Message to History
function addMessageToHistory(role, content) {
    messageHistory.push({ role, content });
}

// Get Full History
function getFullHistory() {
    return messageHistory;
}

// Backup Conversation Function
async function backupConversation() {
    const conversationString = yaml.dump(messageHistory, { indent: 2 });
    const hash = crypto.createHash('sha256').update(conversationString).digest('hex');
    const backupFileName = `${backupDir}/conversation_${hash}.yaml`;

    try {
        await fs.writeFile(backupFileName, conversationString);
        console.log(`Backed up conversation to: ${backupFileName}`);
        return hash;
    } catch (error) {
        console.error("Error backing up conversation:", error);
        return null;
    }
}

// Send Chat Request with History
async function sendChatRequestWithHistory(newMessageContent=null, context='') {
    await loadHistory(); // Load history before each request

    // Add the new user message to the history (if provided)
    if (newMessageContent) {
        addMessageToHistory("user", newMessageContent);
    }

    // Prepare the messages array for the chat request
    const messages = messageHistory.map(item => ({
        role: item.role,
        content: item.content
    }));

    // Send the chat request with the full history and wait for the response to finish
    const response = await new Promise((resolve) => {
        if (messageHistory.length>0) {
            messages[0].content+="\n\n"+context;
            messages[0].content=messages[0].content.trim();
        }
        ollamaKid.sendChatRequest({
            model,
            messages,
            onData: (chunk) => {
                process.stdout.write(chunk.toString());
            },
            onEnd: async (fullResponse) => {
                try {
                    // Add the assistant's response to the history
                    addMessageToHistory("assistant", fullResponse);
                  //  await saveHistory(); // Save the updated history, including the assistant's response
                    const hash = await backupConversation(); // Backup the conversation and get the hash
                    resolve({ fullResponse, hash }); // Resolve the promise with the full response and hash
                } catch (error) {
                    console.error("Error in onEnd:", error);
                    resolve({ fullResponse, hash: null }); // Still resolve, even if there's an error
                }
            }
        });
    });

    return response;
}

// Example Usage (you can adapt this to your needs)
async function main() {
    await ensureBackupDirExists();
    // Check if a message is provided as an argument
    const newMessage = process.argv.length > 3 ? process.argv.slice(3).join(" ") : null;

    const { fullResponse, hash } = await sendChatRequestWithHistory(newMessage);
    console.log(`\nConversation Hash ID: ${hash}`);
    // You can now use the hash for additional operations
}

export async function sendData(historyFile, data,context) {
    setHistoryFile(historyFile);
    await ensureBackupDirExists();
    return await sendChatRequestWithHistory(data, context);
}

async function sendMessageCheckingBackups(message) {
    await ensureBackupDirExists();
    return await sendChatRequestWithHistory(message);
}

//main().catch(console.error);
export  {
    setHistoryFile,
    getHistoryFile,
    loadHistory,
    getFullHistory,
    addMessageToHistory,
    ensureBackupDirExists,
    sendChatRequestWithHistory,
    sendMessageCheckingBackups
};

main().catch(console.error);