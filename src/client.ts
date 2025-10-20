import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport
 } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { input } from '@inquirer/prompts';

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
          
                const tool = tools.find(t => t.name === toolName);

                if (tool === null){console.log("Tool not found")}
                else {handleTool(tool)}
                  break;
        }
        
    }

    
}


async function handleTool(tool: Tool) {
    const args: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(tool.inputSchema.properties ?? {}))
        args[key] = await input({
            message: `Enter value for ${key} (${(value as { type: string }).type})
} `})
    const res = await client.callTool({ name: tool.name, arguments: args })
    console.log(res.content)
 
}




main();