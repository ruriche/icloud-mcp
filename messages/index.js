/**
 * Messages Module
 * MCP tool definitions for Messages.app
 * Note: Messages.app has limited AppleScript support (send only)
 */

const localClient = require('./local-client');
const { handleError } = require('../utils/error-handler');

const messagesTools = [
  {
    name: 'send-message',
    description: 'Send an iMessage or SMS via Messages.app. Note: Can only send messages, cannot read conversations.',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient phone number or email address (required)'
        },
        body: {
          type: 'string',
          description: 'Message content (required)'
        }
      },
      required: ['to', 'body']
    },
    handler: async ({ to, body }) => {
      try {
        const result = await localClient.sendMessage({ to, body });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return handleError(error, 'send-message');
      }
    }
  }
];

module.exports = { messagesTools };
