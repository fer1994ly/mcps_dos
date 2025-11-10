import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  Tool,
  Prompt,
  PromptMessage,
} from "@modelcontextprotocol/sdk/types.js";
import { input, select, confirm } from "@inquirer/prompts";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import "dotenv/config";
import { jsonSchema, ToolSet, generateText } from "ai";

export const client = new Client(
  { name: "test-client", version: "1.0.0" },
  { capabilities: { sampling: {} } },
);

console.log(process.env.GOOGLE_API_KEY);

const transport = new StdioClientTransport({
  command: "node",
  args: ["build/server.js"],
  stderr: "ignore",
});
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

async function main() {
  await client.connect(transport);
  const [{ tools }, { prompts }, { resources }, { resourceTemplates }] =
    await Promise.all([
      client.listTools(),
      client.listPrompts(),
      client.listResources(),
      client.listResourceTemplates(),
    ]);
  console.log("you are connected");

  while (true) {
    const option = await select({
      message: "What do you want to do?",
      choices: ["Query", "Tools", "Resources", "Prompts"],
    });

    switch (option) {
      case "Tools":
        const toolName = await select({
          message: "Select a tool",
          choices: tools.map((tool) => ({
            name: tool.annotations?.title || tool.name,
            value: tool.name,
            description: tool.description,
          })),
        });
        const tool = tools.find((t) => t.name === toolName);
        if (tool == null) {
          console.error("Tool not found.");
        } else {
          await handleTool(tool);
        }
        break;

      case "Resources":
        const resourceUrl = await select({
          message: "Select a resource",
          choices: [
            ...resources.map((resource) => ({
              name: resource.name,
              value: resource.uri,
              description: resource.description,
            })),
            ...resourceTemplates.map((template) => ({
              name: template.name,
              value: template.uriTemplate,
              description: template.description,
            })),
          ],
        });
        const url =
          resources.find((r) => r.uri === resourceUrl)?.uri ??
          resourceTemplates.find((r) => r.uriTemplate === resourceUrl)
            ?.uriTemplate;
        if (url == null) {
          console.log("Resource not found.");
        } else {
          await handleResource(url as string);
        }

        break;

      case "Prompts":
        const promptName = await select({
          message: "Select a prompt",
          choices: prompts.map((prompt) => ({
            name: prompt.name,
            value: prompt.name,
            description: prompt.description,
          })),
        });
        const prompt = prompts.find((p) => p.name === promptName);
        if (prompt == null) {
          console.error("Prompt not found.");
        } else {
          await handlePrompt(prompt);
        }
        break;
      case "Query":
        await handleQuery(tools);
    }
  }
}

async function handleQuery(tools: Tool[]) {
  const query = await input({
    message: "Enter your query:",
  });
  const { text, toolResults } = await generateText({
    model: "gemini-2.5-flash",
    prompt: query,
    tools: tools.reduce(
      (objeto, tool) => ({
        ...objeto,
        [tool.name]: {
          description: tool.description,
          parameters: jsonSchema(tool.inputSchema),
          execute: async (args: Record<string, any>) => {
            return await client.callTool({
              name: tool.name,
              arguments: args,
            });
          },
        },
      }),
      {} as ToolSet,
    ),
  });
  console.log(
    // @ts-expect-error
    text || toolResults[0]?.result?.content[0]?.text || "no text generated",
  );
}

async function handleTool(tool: Tool) {
  const args: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    tool.inputSchema.properties ?? {},
  )) {
    args[key] = await input({
      message: `Enter value for ${key} (${(value as { type: string }).type}):`,
    });
  }

  const res = await client.callTool({
    name: tool.name,
    arguments: args,
  });

  console.log((res.content as [{ text: string }])[0].text);
}
async function handleResource(uri: string) {
  let finalUri = uri;
  const paramMatches = uri.match(/{([^]+)}/g);
  if (paramMatches != null) {
    for (const paramMatch of paramMatches) {
      const paramName = paramMatch.replace("{", "").replace("}", "");
      const paramValue = await input({
        message: `Enter value for ${paramName}:`,
      });
      finalUri = finalUri.replace(paramMatch, paramValue);
    }
  }
  const res = await client.readResource({ uri: finalUri });
  console.log(
    JSON.stringify(JSON.parse(res.contents[0].text as string), null, 2),
  );
}

async function handlePrompt(prompt: Prompt) {
  const args: Record<string, string> = {};
  for (const arg of prompt.arguments ?? []) {
    args[arg.name] = await input({
      message: `Enter value for ${arg.name}: `,
    });
  }
  const response = await client.getPrompt({
    name: prompt.name,
    arguments: args,
  });
  for (const message of response.messages) {
    console.log(await handleServerMessagePrompt(message));
  }
}

async function handleServerMessagePrompt(message: PromptMessage) {
  if (message.content.type !== "text") return;
  console.log(message.content.text);

  const run = await confirm({
    message: "Would you like to run the above prompt?",
    default: true,
  });
  console.log(!run);
  if (!run) return;

  try {
    // Try to call the google provider if available. Different providers
    // may return different shapes so be defensive here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await (google as any)({
      model: "gemini-2.5-flash",
      prompt: message.content.text,
    });

    // Common output shapes: { text }, { output: { text } }, { outputs: [{ text }] }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.log(out);
    const text =
      (out &&
        (out.text ||
          (out.output && out.output.text) ||
          (Array.isArray(out.outputs) && out.outputs[0]?.text))) ||
      message.content.text;
    console.log(text);
    return text;
  } catch (err) {
    // Fallback to returning the original prompt text if generation fails
    return message.content.text;
  }
}

main();
