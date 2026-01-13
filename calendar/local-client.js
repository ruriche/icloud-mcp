/**
 * Local Calendar Client
 * Accesses Calendar.app via AppleScript
 */

const { runAppleScript, runJXA, escapeAppleScript, escapeJXA, formatAppleScriptDate } = require('../utils/applescript');
const config = require('../config');

/**
 * List upcoming events
 * @param {number} count - Number of events to retrieve
 * @param {number} daysAhead - Number of days to look ahead
 * @returns {Promise<Array>} - List of events
 */
async function listEvents(count = 25, daysAhead = 30) {
  const script = `
    const calendar = Application('Calendar');
    const now = new Date();
    const future = new Date(now.getTime() + ${daysAhead} * 24 * 60 * 60 * 1000);
    let events = [];

    const calendars = calendar.calendars();
    for (let cal of calendars) {
      try {
        const calEvents = cal.events();
        for (let evt of calEvents) {
          const startDate = evt.startDate();
          if (startDate >= now && startDate <= future) {
            events.push({
              id: evt.uid(),
              summary: evt.summary(),
              description: evt.description() || '',
              location: evt.location() || '',
              startDate: startDate.toISOString(),
              endDate: evt.endDate().toISOString(),
              allDay: evt.alldayEvent(),
              calendar: cal.name()
            });
          }
        }
      } catch (e) {}
    }

    // Sort by start date
    events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    JSON.stringify(events.slice(0, ${count}));
  `;

  const result = await runJXA(script);
  return result ? JSON.parse(result) : [];
}

/**
 * List all calendars
 * @returns {Promise<Array>} - List of calendars
 */
async function listCalendars() {
  const script = `
    const calendar = Application('Calendar');
    const calendars = calendar.calendars();
    let result = [];

    for (let cal of calendars) {
      result.push({
        name: cal.name(),
        id: cal.id(),
        color: cal.color() || '',
        writable: cal.writable()
      });
    }

    JSON.stringify(result);
  `;

  const result = await runJXA(script);
  return result ? JSON.parse(result) : [];
}

/**
 * Create a new event
 * @param {Object} options - Event options
 * @returns {Promise<Object>} - Created event info
 */
async function createEvent({ summary, start, end, location, description, calendarName, allDay = false }) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Use default calendar if none specified
  const targetCalendar = calendarName || 'Calendar';

  if (allDay) {
    // All-day event
    const script = `
      tell application "Calendar"
        tell calendar "${escapeAppleScript(targetCalendar)}"
          set newEvent to make new event with properties {summary:"${escapeAppleScript(summary)}", start date:date "${formatAppleScriptDate(startDate)}", end date:date "${formatAppleScriptDate(endDate)}", allday event:true}
          ${location ? `set location of newEvent to "${escapeAppleScript(location)}"` : ''}
          ${description ? `set description of newEvent to "${escapeAppleScript(description)}"` : ''}
          return uid of newEvent
        end tell
      end tell
    `;

    const uid = await runAppleScript(script);
    return { success: true, id: uid, message: 'Event created successfully' };
  } else {
    const script = `
      tell application "Calendar"
        tell calendar "${escapeAppleScript(targetCalendar)}"
          set newEvent to make new event with properties {summary:"${escapeAppleScript(summary)}", start date:date "${formatAppleScriptDate(startDate)}", end date:date "${formatAppleScriptDate(endDate)}"}
          ${location ? `set location of newEvent to "${escapeAppleScript(location)}"` : ''}
          ${description ? `set description of newEvent to "${escapeAppleScript(description)}"` : ''}
          return uid of newEvent
        end tell
      end tell
    `;

    const uid = await runAppleScript(script);
    return { success: true, id: uid, message: 'Event created successfully' };
  }
}

/**
 * Update an existing event
 * @param {string} eventId - Event UID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Result
 */
async function updateEvent(eventId, { summary, start, end, location, description }) {
  let updateCommands = [];

  if (summary) updateCommands.push(`set summary of theEvent to "${escapeAppleScript(summary)}"`);
  if (start) updateCommands.push(`set start date of theEvent to date "${formatAppleScriptDate(new Date(start))}"`);
  if (end) updateCommands.push(`set end date of theEvent to date "${formatAppleScriptDate(new Date(end))}"`);
  if (location !== undefined) updateCommands.push(`set location of theEvent to "${escapeAppleScript(location || '')}"`);
  if (description !== undefined) updateCommands.push(`set description of theEvent to "${escapeAppleScript(description || '')}"`);

  if (updateCommands.length === 0) {
    return { success: false, message: 'No updates provided' };
  }

  const script = `
    tell application "Calendar"
      set allCalendars to calendars
      repeat with cal in allCalendars
        try
          set theEvent to first event of cal whose uid is "${escapeAppleScript(eventId)}"
          ${updateCommands.join('\n          ')}
          return "updated"
        end try
      end repeat
      return "not found"
    end tell
  `;

  const result = await runAppleScript(script);
  if (result === 'not found') {
    return { success: false, message: 'Event not found' };
  }
  return { success: true, message: 'Event updated successfully' };
}

/**
 * Delete an event
 * @param {string} eventId - Event UID
 * @returns {Promise<Object>} - Result
 */
async function deleteEvent(eventId) {
  const script = `
    tell application "Calendar"
      set allCalendars to calendars
      repeat with cal in allCalendars
        try
          set theEvent to first event of cal whose uid is "${escapeAppleScript(eventId)}"
          delete theEvent
          return "deleted"
        end try
      end repeat
      return "not found"
    end tell
  `;

  const result = await runAppleScript(script);
  if (result === 'not found') {
    return { success: false, message: 'Event not found' };
  }
  return { success: true, message: 'Event deleted successfully' };
}

module.exports = {
  listEvents,
  listCalendars,
  createEvent,
  updateEvent,
  deleteEvent
};
