"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const client_1 = require("@modelcontextprotocol/sdk/client");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const prompts_1 = require("@inquirer/prompts");
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
                const tool = tools.find(t => t.name === toolName);
                if (tool === null) {
                    console.log("Tool not found");
                }
                else {
                    handleTool(tool);
                }
                break;
        }
    }
}
async function handleTool(tool) {
    const args = {};
    for (const [key, value] of Object.entries(tool.inputSchema.properties ?? {}))
        args[key] = await (0, prompts_1.input)({
            message: `Enter value for ${key} (${value.type})
} `
        });
    const res = await exports.client.callTool({ name: tool.name, arguments: args });
    console.log(res.content);
}
main();
