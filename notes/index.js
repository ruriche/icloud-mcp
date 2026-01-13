/**
 * Notes Module
 * MCP tool definitions for Notes.app
 */

const localClient = require('./local-client');
const { handleError } = require('../utils/error-handler');

const notesTools = [
  {
    name: 'list-note-folders',
    description: 'Lists all folders in Notes.app',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async () => {
      try {
        const folders = await localClient.listNoteFolders();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(folders, null, 2)
          }]
        };
      } catch (error) {
        return handleError(error, 'list-note-folders');
      }
    }
  },
  {
    name: 'list-notes',
    description: 'Lists notes from a specific folder or all folders',
    inputSchema: {
      type: 'object',
      properties: {
        folderName: {
          type: 'string',
          description: 'Name of the folder (optional, lists all if not provided)'
        },
        count: {
          type: 'number',
          description: 'Maximum number of notes to return (default: 25)'
        }
      },
      required: []
    },
    handler: async ({ folderName, count = 25 }) => {
      try {
        const notes = await localClient.listNotes(folderName, count);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(notes, null, 2)
          }]
        };
      } catch (error) {
        return handleError(error, 'list-notes');
      }
    }
  },
  {
    name: 'read-note',
    description: 'Reads the content of a specific note',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'ID of the note to read (required)'
        }
      },
      required: ['noteId']
    },
    handler: async ({ noteId }) => {
      try {
        const note = await localClient.readNote(noteId);
        if (!note) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'Note not found' })
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(note, null, 2)
          }]
        };
      } catch (error) {
        return handleError(error, 'read-note');
      }
    }
  },
  {
    name: 'create-note',
    description: 'Creates a new note',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Note title (required)'
        },
        body: {
          type: 'string',
          description: 'Note content/body'
        },
        folderName: {
          type: 'string',
          description: 'Folder to create the note in (default: Notes)'
        }
      },
      required: ['title']
    },
    handler: async (args) => {
      try {
        const result = await localClient.createNote(args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return handleError(error, 'create-note');
      }
    }
  },
  {
    name: 'search-notes',
    description: 'Search notes by text in title or content',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search text (required)'
        },
        count: {
          type: 'number',
          description: 'Maximum results to return (default: 25)'
        }
      },
      required: ['query']
    },
    handler: async ({ query, count = 25 }) => {
      try {
        const results = await localClient.searchNotes(query, count);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error) {
        return handleError(error, 'search-notes');
      }
    }
  }
];

module.exports = { notesTools };
