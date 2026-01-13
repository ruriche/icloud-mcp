/**
 * Local Reminders Client
 * Accesses Reminders.app via AppleScript
 */

const { runAppleScript, runJXA, escapeAppleScript, escapeJXA, formatAppleScriptDate } = require('../utils/applescript');

/**
 * List all reminder lists
 * @returns {Promise<Array>} - List of reminder lists
 */
async function listReminderLists() {
  const script = `
    const reminders = Application('Reminders');
    const lists = reminders.lists();
    let result = [];

    for (let list of lists) {
      const rems = list.reminders();
      const incomplete = rems.filter(r => !r.completed()).length;

      result.push({
        id: list.id(),
        name: list.name(),
        color: list.color() || '',
        totalCount: rems.length,
        incompleteCount: incomplete
      });
    }

    JSON.stringify(result);
  `;

  const result = await runJXA(script);
  return result ? JSON.parse(result) : [];
}

/**
 * List reminders from a list
 * @param {string} listName - List name (optional, defaults to all)
 * @param {boolean} includeCompleted - Include completed reminders
 * @param {number} count - Max reminders to return
 * @returns {Promise<Array>} - List of reminders
 */
async function listReminders(listName = null, includeCompleted = false, count = 50) {
  const listFilter = listName ? `.byName("${escapeJXA(listName)}")` : '';
  const completedFilter = includeCompleted ? '' : '.filter(r => !r.completed())';

  const script = `
    const reminders = Application('Reminders');
    let allReminders = [];

    ${listName ? `
    const list = reminders.lists${listFilter};
    const rems = list.reminders()${completedFilter};
    for (let r of rems) {
      allReminders.push({
        id: r.id(),
        name: r.name(),
        body: r.body() || '',
        completed: r.completed(),
        dueDate: r.dueDate() ? r.dueDate().toISOString() : null,
        priority: r.priority(),
        list: list.name()
      });
    }
    ` : `
    const lists = reminders.lists();
    for (let list of lists) {
      const rems = list.reminders()${completedFilter};
      for (let r of rems) {
        allReminders.push({
          id: r.id(),
          name: r.name(),
          body: r.body() || '',
          completed: r.completed(),
          dueDate: r.dueDate() ? r.dueDate().toISOString() : null,
          priority: r.priority(),
          list: list.name()
        });
      }
    }
    `}

    // Sort by due date (nulls at end)
    allReminders.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    JSON.stringify(allReminders.slice(0, ${count}));
  `;

  const result = await runJXA(script);
  return result ? JSON.parse(result) : [];
}

/**
 * Create a new reminder
 * @param {Object} options - Reminder options
 * @returns {Promise<Object>} - Created reminder info
 */
async function createReminder({ name, body, dueDate, listName = 'Reminders', priority = 0 }) {
  let properties = [`name:"${escapeAppleScript(name)}"`];

  if (body) properties.push(`body:"${escapeAppleScript(body)}"`);
  if (priority) properties.push(`priority:${priority}`);

  let script = `
    tell application "Reminders"
      tell list "${escapeAppleScript(listName)}"
        set newReminder to make new reminder with properties {${properties.join(', ')}}
  `;

  if (dueDate) {
    script += `
        set due date of newReminder to date "${formatAppleScriptDate(new Date(dueDate))}"
    `;
  }

  script += `
        return id of newReminder
      end tell
    end tell
  `;

  const id = await runAppleScript(script);
  return { success: true, id, message: 'Reminder created successfully' };
}

/**
 * Update a reminder
 * @param {string} reminderId - Reminder ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Result
 */
async function updateReminder(reminderId, { name, body, dueDate, priority }) {
  let updateCommands = [];

  if (name) updateCommands.push(`set name of theReminder to "${escapeAppleScript(name)}"`);
  if (body !== undefined) updateCommands.push(`set body of theReminder to "${escapeAppleScript(body || '')}"`);
  if (priority !== undefined) updateCommands.push(`set priority of theReminder to ${priority}`);
  if (dueDate) updateCommands.push(`set due date of theReminder to date "${formatAppleScriptDate(new Date(dueDate))}"`);
  if (dueDate === null) updateCommands.push(`set due date of theReminder to missing value`);

  const script = `
    tell application "Reminders"
      set allLists to lists
      repeat with theList in allLists
        try
          set theReminder to reminder id "${escapeAppleScript(reminderId)}" of theList
          ${updateCommands.join('\n          ')}
          return "updated"
        end try
      end repeat
      return "not found"
    end tell
  `;

  const result = await runAppleScript(script);
  if (result === 'not found') {
    return { success: false, message: 'Reminder not found' };
  }
  return { success: true, message: 'Reminder updated successfully' };
}

/**
 * Mark a reminder as complete/incomplete
 * @param {string} reminderId - Reminder ID
 * @param {boolean} completed - Completion status
 * @returns {Promise<Object>} - Result
 */
async function completeReminder(reminderId, completed = true) {
  const script = `
    tell application "Reminders"
      set allLists to lists
      repeat with theList in allLists
        try
          set theReminder to reminder id "${escapeAppleScript(reminderId)}" of theList
          set completed of theReminder to ${completed}
          return "done"
        end try
      end repeat
      return "not found"
    end tell
  `;

  const result = await runAppleScript(script);
  if (result === 'not found') {
    return { success: false, message: 'Reminder not found' };
  }
  return { success: true, message: `Reminder marked as ${completed ? 'complete' : 'incomplete'}` };
}

/**
 * Delete a reminder
 * @param {string} reminderId - Reminder ID
 * @returns {Promise<Object>} - Result
 */
async function deleteReminder(reminderId) {
  const script = `
    tell application "Reminders"
      set allLists to lists
      repeat with theList in allLists
        try
          set theReminder to reminder id "${escapeAppleScript(reminderId)}" of theList
          delete theReminder
          return "deleted"
        end try
      end repeat
      return "not found"
    end tell
  `;

  const result = await runAppleScript(script);
  if (result === 'not found') {
    return { success: false, message: 'Reminder not found' };
  }
  return { success: true, message: 'Reminder deleted successfully' };
}

/**
 * Search reminders
 * @param {string} query - Search query
 * @param {number} count - Max results
 * @returns {Promise<Array>} - Matching reminders
 */
async function searchReminders(query, count = 25) {
  const searchTerm = escapeJXA(query.toLowerCase());

  const script = `
    const reminders = Application('Reminders');
    const lists = reminders.lists();
    let results = [];

    for (let list of lists) {
      const rems = list.reminders();
      for (let r of rems) {
        if (results.length >= ${count}) break;

        const name = (r.name() || '').toLowerCase();
        const body = (r.body() || '').toLowerCase();

        if (name.includes("${searchTerm}") || body.includes("${searchTerm}")) {
          results.push({
            id: r.id(),
            name: r.name(),
            body: r.body() || '',
            completed: r.completed(),
            dueDate: r.dueDate() ? r.dueDate().toISOString() : null,
            priority: r.priority(),
            list: list.name()
          });
        }
      }
    }

    JSON.stringify(results);
  `;

  const result = await runJXA(script);
  return result ? JSON.parse(result) : [];
}

module.exports = {
  listReminderLists,
  listReminders,
  createReminder,
  updateReminder,
  completeReminder,
  deleteReminder,
  searchReminders
};
