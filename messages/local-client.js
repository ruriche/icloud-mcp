/**
 * Local Messages Client
 * Accesses Messages.app via AppleScript
 * Note: Messages.app has limited AppleScript support - can only send, not read
 */

const { runAppleScript, escapeAppleScript } = require('../utils/applescript');

/**
 * Send an iMessage or SMS
 * @param {Object} options - Message options
 * @returns {Promise<Object>} - Send result
 */
async function sendMessage({ to, body }) {
  // Determine if it's a phone number or email
  const isPhone = /^[\d\s\-\+\(\)]+$/.test(to.replace(/\s/g, ''));

  const script = `
    tell application "Messages"
      set targetService to 1st account whose service type = iMessage
      set targetBuddy to participant "${escapeAppleScript(to)}" of targetService
      send "${escapeAppleScript(body)}" to targetBuddy
    end tell
    return "sent"
  `;

  try {
    await runAppleScript(script);
    return { success: true, message: `Message sent to ${to}` };
  } catch (error) {
    // Try alternative approach for phone numbers
    if (isPhone) {
      const altScript = `
        tell application "Messages"
          set targetService to 1st account whose service type = iMessage
          set theBuddy to buddy "${escapeAppleScript(to)}" of targetService
          send "${escapeAppleScript(body)}" to theBuddy
        end tell
        return "sent"
      `;

      try {
        await runAppleScript(altScript);
        return { success: true, message: `Message sent to ${to}` };
      } catch (e) {
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Send a message using Shortcuts Events (more reliable)
 * @param {Object} options - Message options
 * @returns {Promise<Object>} - Send result
 */
async function sendMessageViaShortcuts({ to, body }) {
  // This method uses "Shortcuts Events" which can be more reliable
  const script = `
    tell application "Messages"
      send "${escapeAppleScript(body)}" to buddy "${escapeAppleScript(to)}" of (1st account whose service type = iMessage)
    end tell
    return "sent"
  `;

  await runAppleScript(script);
  return { success: true, message: `Message sent to ${to}` };
}

module.exports = {
  sendMessage,
  sendMessageViaShortcuts
};
