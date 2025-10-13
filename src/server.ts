import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { create } from "domain";
import { json } from "stream/consumers";
import z from "zod";
import { readonly } from "zod/v4";
import fs from "node:fs/promises";
import { text } from "node:stream/consumers";



const server = new McpServer({
    name:"test",
    version:"1.0.0",
    capabilities: {
        resources:{},
        tools:{},
        prompts:{}
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