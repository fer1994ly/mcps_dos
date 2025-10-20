"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const client_1 = require("@modelcontextprotocol/sdk/client");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
exports.client = new client_1.Client({ name: "test-client", version: "1.0.0" }, { capabilities: { sampling: {} } });
const transport = new stdio_js_1.StdioClientTransport({ command: "node", args: ["build/server.js"], stderr: "ignore" });
async function main() {
    await exports.client.connect(transport);
    const [{ tools }, { prompts }, { resources }, { ResourceTemplate }] = await Promise.all([
        exports.client.listTools(),
        exports.client.listPrompts(),
        exports.client.listResources(),
        exports.client.listResourceTemplates()
    ]);
    console.log("you are connected");
    while (true) {
        const option = await select({
            message: "What do you want to do?",
            choices: ["Query", "Tools", "Resources", "Prompts"]
        });
        switch (option) {
            case "Tools":
                const toolName = await select({
                    message: "Select a tool to run",
                    choices: tools.map(t => ({ name: t.annotations, value: t.name, description: t.description }))
                });
        }
    }
}
main();
