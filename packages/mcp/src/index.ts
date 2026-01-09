#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

let connectedUrl: string | null = null

const server = new Server(
  {
    name: 'claude-whiteboard-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'canvas_connect',
        description: 'Connect to a whiteboard session by URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The whiteboard URL (e.g., https://abc123.ngrok.io)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'canvas_get',
        description: 'Fetch current canvas JSON from connected whiteboard',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'canvas_set',
        description: 'Push new canvas JSON to connected whiteboard',
        inputSchema: {
          type: 'object',
          properties: {
            elements: {
              type: 'array',
              description: 'Array of Excalidraw elements',
            },
          },
          required: ['elements'],
        },
      },
      {
        name: 'canvas_savepoint',
        description: 'Create a named checkpoint on the server',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the savepoint',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'canvas_rollback',
        description: 'Restore canvas to a previous savepoint',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the savepoint to restore',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'canvas_history',
        description: 'List available savepoints with timestamps',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'canvas_connect': {
      const url = (args as { url: string }).url.replace(/\/$/, '')
      try {
        const res = await fetch(`${url}/health`)
        if (!res.ok) throw new Error('Health check failed')
        connectedUrl = url

        const sessionRes = await fetch(`${url}/api/session`)
        const session = await sessionRes.json()

        return {
          content: [
            {
              type: 'text',
              text: `Connected to whiteboard '${session.name}' at ${url}`,
            },
          ],
        }
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to connect to ${url}: ${err}`,
            },
          ],
          isError: true,
        }
      }
    }

    case 'canvas_get': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/canvas`)
        const canvas = await res.json()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(canvas, null, 2),
            },
          ],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to get canvas: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_set': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/canvas`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elements: (args as { elements: unknown[] }).elements }),
        })
        if (!res.ok) throw new Error('Failed to update canvas')
        return {
          content: [{ type: 'text', text: 'Canvas updated successfully' }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to set canvas: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_savepoint': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/savepoints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: (args as { name: string }).name }),
        })
        if (!res.ok) throw new Error('Failed to create savepoint')
        return {
          content: [{ type: 'text', text: `Savepoint '${(args as { name: string }).name}' created` }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to create savepoint: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_rollback': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/savepoints/${(args as { name: string }).name}`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('Failed to rollback')
        return {
          content: [{ type: 'text', text: `Rolled back to '${(args as { name: string }).name}'` }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to rollback: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_history': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/savepoints`)
        const savepoints = await res.json()
        if (savepoints.length === 0) {
          return {
            content: [{ type: 'text', text: 'No savepoints found' }],
          }
        }
        const list = savepoints.map((s: { name: string; timestamp: string }) =>
          `- ${s.name} (${s.timestamp})`
        ).join('\n')
        return {
          content: [{ type: 'text', text: `Savepoints:\n${list}` }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to list savepoints: ${err}` }],
          isError: true,
        }
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Claude Whiteboard MCP server running')
}

main().catch(console.error)
