import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport
 } from "@modelcontextprotocol/sdk/client/stdio.js";

export const client = new Client({name:"test-client", version:"1.0.0"},{capabilities:{sampling:{}}});

const transport = new StdioClientTransport({command:"node", args: ["build/server.js"],stderr:"ignore"});

async function main() {
    await client.connect(transport);
    const [{tools},{prompts},{resources},{ResourceTemplate}] = await Promise.all([
        client.listTools(),
        client.listPrompts(),
        client.listResources(),
        client.listResourceTemplates()
    ]);
console.log("you are connected")

    while (true) {
        const option = await select({
            message: "What do you want to do?",
            choices: ["Query", "Tools", "Resources", "Prompts"]
        })

        switch (option) {
            case "Tools":
                const toolName = await select({
                    message: "Select a tool to run",
                    choices: tools.map(t =>
                        ({ name: t.annotations, value: t.name, description: t.description })
                    )
                });
            
        }
    }
}

main();