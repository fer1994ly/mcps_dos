import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { create } from "domain";

// If MCP_SILENT=true, silence console.log and console.info so VS Code's
// Add context -> MCP RESOURCES (which spawns the server over stdio) doesn't
// show any non-protocol output in the terminal.
if (process.env.MCP_SILENT === "true") {
    console.log = (..._args: any[]) => { /* silent */ };
    console.info = (..._args: any[]) => { /* silent */ };
}

import { json } from "stream/consumers";
import z from "zod";
import { readonly } from "zod/v4";
import fs from "node:fs/promises";
import { text } from "node:stream/consumers";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";



const server = new McpServer({
    name:"test",
    version:"1.0.0",
    capabilities: {
        resources:{},
        tools:{},
        prompts:{}
    }
})


server.tool("create-random-user", "create a new user in the database",
    {
        title: "create-random-user",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
    },
    async () => {
        const res = await server.server.request(
            {
                method: "sampling/createMessage",
                params: {
                    messages: [{
                        role: "user",
                        content: {
                            type: "text",
                            text: "generate a fake user date. The user should have a realistic name, email, address and phone number. Return this data as JSON object with no other text formatted so it can be used with JSON.parse",

                        }
                    }
                    ], maxTokens: 1024

                },


            },
            CreateMessageResultSchema
        )


        if (res.content.type !== "text") {
            return { content: [{ type: "text", text: "failed to generate user data" }] }
        }
        try {
            const fakeUser = JSON.parse(res.content.text.trim().replace(/^```(?:json|JSON)\n?/, "").replace(/```$/, "").trim())
            const id = await createUser(fakeUser)
            return { content: [{ type: "text", text: `User ${id} created succesfully` }] }
        }
        catch {
            return { content: [{ type: "text", text: "failed to generate user data" }] }

        }
    })
   

server.tool("create-user", "create new a new user in the database", {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string()
},{
    title: "create-user",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true   
},

    async (params)=> {
        try {
            const id = await createUser(params)
        }
        catch {
            return {
                content: [{ type: "text", text: "fail to save user" }]
            }
        }
        return {
            content: [{ type: "text", text: " user saved successfully" }]
            }
        
    }
)



server.resource("users","users://all", {description:"get all users in the database",
    title: "users",
    mindtype: "application/json",

}, 


async (uri)=> {
    const users = await import("./data/users.json",{  with: { type: "json" }}).then(m => m.default)
    return {
        contents:[{
            uri:uri.href,
            text: JSON.stringify(users,null,2),
            mimeType:"application/json"
        }]
    }
  
}

)

server.resource("user-details",new ResourceTemplate("users://{userId}/profile",{list:undefined}),
 {description:"get a user details from the database",
    title: "user-details",
    mindtype: "application/json",

}, 


    async (uri, { userId }) => {
        const users = await import("./data/users.json", { with: { type: "json" } }).then(m => m.default)
        const user = users.find((u: any) => u.id === parseInt(userId as string))
        if (user == null) {
            return {
                contents: [{
                    uri: uri.href,
                    text: JSON.stringify({ error: "user not found" }, null, 2),
                    mimeType: "application/json"
                }
            ]
            }
            
  
        }
        return {
                contents: [{
                    uri: uri.href,
                    text: JSON.stringify(user, null, 2),
                    mimeType: "application/json"
                }]
            }
    }
)

server.prompt("generate-user", "generate a fake user based on a given name", {
    name: z.string()
}, async ({name}) => {
    
    return {
        messages: [
            {
                role: "user",
            
            content: {
                    type: "text",
                    text: `generate a fake user with name ${name} with email, 
            address and phone in json format without any other text`
                }
            }]
        }})

async function createUser(user: {
    name: string,
    email: string,
    address: string,
    phone: string
}) {
    const users = await import("./data/users.json",
      {  with: { type: "json" }}
    ).then(m => m.default)

    const id = users.length+1
    users.push({
        id, ...user
    })

    await fs.writeFile("./src/data/users.json",JSON.stringify(users,null,2))

    return id
    
}


async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
}

main()
