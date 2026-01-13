/**
 * AppleScript Executor Utility
 * Executes AppleScript and JXA scripts via osascript
 */

const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Execute an AppleScript string
 * @param {string} script - The AppleScript code to execute
 * @returns {Promise<string>} - The script output
 */
async function runAppleScript(script) {
  try {
    const { stdout, stderr } = await execFileAsync('osascript', ['-e', script], {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });
    return stdout.trim();
  } catch (error) {
    throw new AppleScriptError(error.message, script);
  }
}

/**
 * Execute a JXA (JavaScript for Automation) script
 * @param {string} script - The JXA code to execute
 * @returns {Promise<string>} - The script output
 */
async function runJXA(script) {
  try {
    const { stdout, stderr } = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', script], {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });
    return stdout.trim();
  } catch (error) {
    throw new AppleScriptError(error.message, script);
  }
}

/**
 * Execute JXA and parse JSON result
 * @param {string} script - JXA script that returns JSON.stringify() output
 * @returns {Promise<any>} - Parsed JSON result
 */
async function runJXAWithJSON(script) {
  const result = await runJXA(script);
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch (e) {
    return result;
  }
}

/**
 * Escape string for use in AppleScript
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeAppleScript(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Escape string for use in JXA
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeJXA(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Format date for AppleScript
 * @param {Date|string} date - Date to format
 * @returns {string} - AppleScript date string
 */
function formatAppleScriptDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  // Format: "January 15, 2026 at 10:30:00 AM"
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).replace(',', ' at');
}

/**
 * Custom error class for AppleScript errors
 */
class AppleScriptError extends Error {
  constructor(message, script) {
    super(message);
    this.name = 'AppleScriptError';
    this.script = script;

    // Parse common AppleScript errors
    if (message.includes('not allowed')) {
      this.code = 'PERMISSION_DENIED';
      this.userMessage = 'Permission denied. Please grant access in System Settings > Privacy & Security.';
    } else if (message.includes('Application isn\'t running')) {
      this.code = 'APP_NOT_RUNNING';
      this.userMessage = 'The application is not running.';
    } else if (message.includes('Can\'t get')) {
      this.code = 'NOT_FOUND';
      this.userMessage = 'The requested item was not found.';
    } else {
      this.code = 'SCRIPT_ERROR';
      this.userMessage = message;
    }
  }
}

module.exports = {
  runAppleScript,
  runJXA,
  runJXAWithJSON,
  escapeAppleScript,
  escapeJXA,
  formatAppleScriptDate,
  AppleScriptError
};
