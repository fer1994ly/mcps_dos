import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { input, select } from '@inquirer/prompts';

export const client = new Client({name:"test-client", version:"1.0.0"},{capabilities:{sampling:{}}});

const transport = new StdioClientTransport({command:"node", args: ["build/server.js"],stderr:"ignore"});

async function main() {
    await client.connect(transport);
    const [{tools},{prompts},{resources},{resourceTemplates}] = await Promise.all([
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
                    message: "Select a tool",
                    choices: tools.map(tool => ({
                        name: tool.annotations?.title || tool.name,
                        value: tool.name,
                        description: tool.description,
                    })),
                })
                const tool = tools.find(t => t.name === toolName)
                if (tool == null) {
                    console.error("Tool not found.")
                } else {
                    await handleTool(tool)
                }
                break;

            case "Resources":
                const resourceUrl = await select({
                    message: "Select a resource",
                    choices: [
                        ...resources.map(resource => ({
                            name: resource.name,
                            value: resource.url,
                            description: resource.description,
                        })),
                        ...resourceTemplates.map(template => ({
                            name: template.name,
                            value: template.url,
                            description: template.description,
                        }))
                    ]
                })
                const url = resources.find(r => r.uri === resourceUrl)?.uri ??
          resourceTemplates.find(r => r.uriTemplate === resourceUrl)
            ?.uriTemplate
                if(url == null) {
                    console.log("Resource not found.")
                }
                else {

                    await handleResource(url as string)
                }
                
                break;
        }
    }
}

async function handleTool(tool: Tool) {
    const args: Record<string, string> = {}
    for (const [key, value] of Object.entries(
        tool.inputSchema.properties ?? {}
    )) {
        args[key] = await input({
            message: `Enter value for ${key} (${(value as { type: string }).type}):`,
        })
    }

    const res = await client.callTool({
        name: tool.name,
        arguments: args,
    })

    console.log((res.content as [{ text: string }])[0].text)
}

async function handleResource(uri: string) {
    let finalUri = uri
    const paramMatches = uri.match(/{([^]+)}/g)
    if (paramMatches!= null){
        for (const paramMatch of paramMatches){
            const paramName = paramMatch.replace("{","").replace("}","")
            const paramValue = await input({
                message:`Enter value for ${paramName}:`,
                
            })
            finalUri = finalUri.replace(paramMatch,paramValue)
        }
    } 
const res = await client.readResource({uri:finalUri})
console.log(JSON.stringify(JSON.parse(res.contents[0].text as string), null, 2))
    
}


main();
