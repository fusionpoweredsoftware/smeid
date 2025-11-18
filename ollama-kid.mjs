// ollama-history-manager.mjs
import ollama from 'ollama';
import axios from 'axios';
import fs from 'fs/promises'; // Use fs.promises for async file operations

/**
 * A history manager for Ollama that provides controlled, non-persistent chat history
 */
async function sendChatRequest({
    onData = (chunk) => {
        // Directly log the text content of the chunk
        process.stdout.write(chunk.toString());
    },
    onEnd = () => { },
    replacer = [],
    file = "file.txt",
    fileReader = fs.readFile,
    content = undefined,
    model = "llama3.2",
    messages = [{ role: "user", content }],
    chatData = { think: false, model, messages },
    serverIP = "localhost",
    local = true,
    port = 3000,
}) {
    let allData = "";
    const p = new Promise(async (resolve) => {
        ;
        try {
            if (JSON.stringify(messages) == JSON.stringify([{ role: "user", undefined }])) {
                content = `${await fileReader(file)}`;
            }

            for (let i of replacer) {
                for (let r in replacer[i]) {
                    chatData.messages[i].content = chatData.messages[i].content.replace(
                        new RegExp(r, "g"),
                        replacer[r]
                    );
                }
            }
            let response;
            if (!local) {
                response = await axios.post(
                    `http://${serverIP}:${port}/chat`,
                    chatData,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        responseType: "stream",
                    }
                );
                response.data.on("data", (chunk) => {
                    allData += chunk;
                    onData(chunk);
                });
                response.data.on("end", () => {
                    onEnd(allData);
                    resolve(allData);
                });
            } else {
                response = await ollama.chat({
                    ...chatData,
                    stream: true
                });
                let responseText='';
                for await (const part of response) {
                    responseText += part.message.content;
                    onData(part.message.content);
                }
                responseText += " ";
                onEnd(responseText);
                resolve(responseText);
            }
        } catch (error) {
            console.error("Error sending chat:", error.message);
        }
    });
    return p;
}

export default { sendChatRequest };
