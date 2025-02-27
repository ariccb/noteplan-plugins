// @flow
//-----------------------------------------------------------------------------
// clickHandlers.js
// Handler functions for dashboard clicks that come over the bridge
// The routing is in pluginToHTMLBridge.js/bridgeClickDashboardItem()
// Last updated 4.7.2024 for v2.0.1 by @jgclark
//-----------------------------------------------------------------------------
import {
  addChecklistToNoteHeading,
  addTaskToNoteHeading,
} from "../../jgclark.QuickCapture/src/quickCapture"
import pluginJson from "../plugin.json"
import { allCalendarSectionCodes } from "./constants"
import {
  buildListOfDoneTasksToday,
  getTotalDoneCounts,
  rollUpDoneCounts,
} from "./countDoneTasks"
import {
  getDashboardSettings,
  handlerResult,
  mergeSections,
  // moveItemBetweenCalendarNotes,
  moveItemToRegularNote,
  setPluginData,
} from "./dashboardHelpers"
import {
  type MessageDataObject,
  type TBridgeClickHandlerResult,
  type TPluginData,
} from "./types"
import { getAllSectionsData, getSomeSectionsData } from "./dataGeneration"
import { validateAndFlattenMessageObject } from "./shared"
import {
  cancelItem,
  completeItem,
  completeItemEarlier,
  deleteItem,
  findParaFromStringAndFilename,
  highlightParagraphInEditor,
  // toggleTaskChecklistParaType,
  unscheduleItem,
} from "@helpers/NPParagraph"
import { getNPWeekData, type NotePlanWeekInfo } from "@helpers/NPdateTime"
import { openNoteByFilename } from "@helpers/NPnote"
import {
  calcOffsetDateStr,
  getDateStringFromCalendarFilename,
  getTodaysDateHyphenated,
  RE_DATE,
  RE_DATE_INTERVAL,
  replaceArrowDatesInString,
} from "@helpers/dateTime"
import {
  clo, JSP, logDebug, logError, logInfo, logTimer, logWarn, timer
} from "@helpers/dev"
import { getGlobalSharedData } from "@helpers/HTMLView"
import {
  cyclePriorityStateDown,
  cyclePriorityStateUp,
} from "@helpers/paragraph"
import { showMessage } from "@helpers/userInput"

/****************************************************************************************************************************
 *                             NOTES
 ****************************************************************************************************************************
- Handlers should use the standard return type of TBridgeClickHandlerResult
- handlerResult() can be used to create the result object
- Types are defined in types.js
    - type TActionOnReturn = 'UPDATE_CONTENT' | 'REMOVE_LINE' | 'REFRESH_JSON'

/****************************************************************************************************************************
 *                             Data types + constants
 ****************************************************************************************************************************/

const windowCustomId = `${pluginJson['plugin.id']}.main`
const WEBVIEW_WINDOW_ID = windowCustomId

/****************************************************************************************************************************
 *                             HANDLERS
 ****************************************************************************************************************************/

/**
 * Tell the React window to update by re-generating all Sections
 */
export async function refreshAllSections(): Promise<void> {
  const startTime = new Date()
  const reactWindowData = await getGlobalSharedData(WEBVIEW_WINDOW_ID)
  // show refreshing message until done
  await setPluginData({ refreshing: true }, 'Starting Refreshing all sections')

  // refresh all sections' data
  const newSections = await getAllSectionsData(reactWindowData.demoMode, false, false)
  const changedData = {
    refreshing: false,
    sections: newSections,
    lastFullRefresh: new Date(),
    totalDoneCounts: getTotalDoneCounts(newSections)
  }
  await setPluginData(changedData, 'Finished Refreshing all sections')
  logTimer('refreshAllSections', startTime, `at end for all sections`)

  // re-calculate all done task counts (if the appropriate setting is on)
  const settings = reactWindowData.pluginData.dashboardSettings
  if (settings.doneDatesAvailable) {
    const totalDoneCounts = rollUpDoneCounts([getTotalDoneCounts(reactWindowData.pluginData.sections)], buildListOfDoneTasksToday())
    const changedData = {
      totalDoneCounts: totalDoneCounts
    }
    await setPluginData(changedData, 'Updating doneCounts at end of refreshAllSections')
  }
}

/**
 * Loop through sectionCodes and tell the React window to update by re-generating a subset of Sections.
 * This is used on first launch to improve the UX and speed of first render.
 * Each section is returned to React as it's generated.
 * Today loads first and then this function is automatically called from a useEffect in 
 * Dashboard.jsx to load the rest.
 * @param {MessageDataObject} data 
 * @param {boolean} calledByTrigger? (default: false)
 * @param {boolean} setFullRefreshDate? (default: false) - whether to set the lastFullRefresh date (default is no)
 * @returns {TBridgeClickHandlerResult}
 */
export async function incrementallyRefreshSections(data: MessageDataObject, 
  calledByTrigger: boolean = false, setFullRefreshDate: boolean = false): Promise<TBridgeClickHandlerResult> {
  const incrementalStart = new Date()
  const { sectionCodes } = data
  if (!sectionCodes) {
    logError('incrementallyRefreshSections', 'No sectionCodes provided')
    return handlerResult(false)
  }
  // loop through sectionCodes
  await setPluginData({ refreshing: true }, `Starting incremental refresh for sections ${String(sectionCodes)}`)
  for (const sectionCode of sectionCodes) {
    const start = new Date()
    await refreshSomeSections({ ...data, sectionCodes: [sectionCode] }, calledByTrigger)
    logDebug(`clickHandlers`, `incrementallyRefreshSections getting ${sectionCode}) took ${timer(start)}`)
  }

  const updates:any = { refreshing: false }
  if (setFullRefreshDate) updates.lastFullRefresh = new Date()
  await setPluginData(updates, `Ending incremental refresh for sections ${String(sectionCodes)}`)
  logTimer('incrementallyRefreshSections', incrementalStart, `for ${sectionCodes.length} sections`, 2000)

  // re-calculate done task counts (if the appropriate setting is on)
  const reactWindowData = await getGlobalSharedData(WEBVIEW_WINDOW_ID)
  const settings = reactWindowData.pluginData.dashboardSettings
  if (settings.doneDatesAvailable) {
    const totalDoneCounts = rollUpDoneCounts([getTotalDoneCounts(reactWindowData.pluginData.sections)], buildListOfDoneTasksToday())
    const changedData = {
      totalDoneCounts: totalDoneCounts
    }
    await setPluginData(changedData, 'Updating doneCounts at end of incrementallyRefreshSections')
  }

  return handlerResult(true)
}

/**
 * Tell the React window to update by re-generating a subset of Sections.
 * Returns them all in one shot vs incrementallyRefreshSections which updates one at a time.
 * @param {MessageDataObject} data 
 * @param {boolean} calledByTrigger? (default: false)
 * @returns {TBridgeClickHandlerResult}
 */
export async function refreshSomeSections(data: MessageDataObject, calledByTrigger: boolean = false): Promise<TBridgeClickHandlerResult> {
  const start = new Date()
  const { sectionCodes } = data
  if (!sectionCodes) {
    logError('refreshSomeSections', 'No sectionCodes provided')
    return handlerResult(false)
  }
  logDebug('refreshSomeSections', `Starting for ${String(sectionCodes)}`)
  const reactWindowData = await getGlobalSharedData(WEBVIEW_WINDOW_ID)
  const pluginData: TPluginData = reactWindowData.pluginData
  // show refreshing message until done
  if (!pluginData.refreshing === true) await setPluginData({ refreshing: sectionCodes }, `Starting refresh for sections ${String(sectionCodes)}`)
  const existingSections = pluginData.sections

  // force the section refresh for the wanted sections
  const newSections = await getSomeSectionsData(sectionCodes, pluginData.demoMode, calledByTrigger)
  // logDebug('refreshSomeSections', `- after getSomeSectionsData(): ${timer(start)}`)
  const mergedSections = mergeSections(existingSections, newSections)
  // logDebug('refreshSomeSections', `- after mergeSections(): ${timer(start)}`)

  const updates:TAnyObject = { sections: mergedSections }
  // and update the total done counts
  // TODO: turning off for now. Need to figure this out.
  // updates.totalDoneCounts = getTotalDoneCounts(mergedSections)

  if (!pluginData.refreshing === true) updates.refreshing = false
  await setPluginData(updates, `Finished refresh for sections ${String(sectionCodes)}`)
  logTimer('refreshSomeSections', start, `for ${sectionCodes.toString()}`, 2000)
  return handlerResult(true)
}

/**
 * Prepend an open task to 'calNoteFilename' calendar note, using text we prompt the user for.
 * Note: It only writes to Calendar, as that's only what Dashboard needs.
 * @param {MessageDataObject} {actionType: addTask|addChecklist etc., toFilename:xxxxx}
 */
export async function doAddItem(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
  try {
    const config = getDashboardSettings()
    // clo(data, 'data for doAddItem', 2)
    const { actionType, toFilename, sectionCodes } = data

    logDebug('doAddItem', `- actionType: ${actionType} to ${toFilename || ''} in section ${String(sectionCodes)}`)
    if (!toFilename) {
      throw new Error('doAddItem: No toFilename provided')
    }
    const todoType = (actionType === 'addTask') ? 'task' : 'checklist'

    const calNoteDateStr = getDateStringFromCalendarFilename(toFilename, true)
    // logDebug('addTask', `= date ${calNoteDateStr}`)
    if (!calNoteDateStr) {
      throw new Error(`calNoteDateStr isn't defined for ${toFilename}`)
    }

    const content = await CommandBar.showInput(`Type the ${todoType} text to add`, `Add ${todoType} '%@' to ${calNoteDateStr}`)

    // Add text to the new location in destination note
    // FIXME: following not working yet -- add separate setting
    // Use 'headingLevel' ("Heading level for new Headings") from the setting in QuickCapture if present (or default to 2)
    const newHeadingLevel = config.newTaskSectionHeadingLevel
    const headingToUse = config.newTaskSectionHeading
    // logDebug('doAddItem', `newHeadingLevel: ${newHeadingLevel}`)

    if (actionType === 'addTask') {
      addTaskToNoteHeading(calNoteDateStr, headingToUse, content, newHeadingLevel)
    } else {
      addChecklistToNoteHeading(calNoteDateStr, headingToUse, content, newHeadingLevel)
    }
    // TEST: update cache
    DataStore.updateCache(DataStore.noteByFilename(toFilename, 'Calendar'))

    // update just the section we've added to
    // Note: earlier work is smart enough to realise that pressing the nextPeriod button in DT -> DO
    // FIXME: this doesn't seem to work for DO, but does for DT
    return handlerResult(true, ['REFRESH_SECTION_IN_JSON', 'START_DELAYED_REFRESH_TIMER'], { sectionCodes: sectionCodes })
  }
  catch (err) {
    logError('doAddItem', err.message)
    return { success: false }
  }
}

/** 
 * Complete the task in the actual Note.
 * @param {MessageDataObject} data - The data object containing information for content update.
 * @returns {TBridgeClickHandlerResult} The result of the content update operation.
 */
export function doCompleteTask(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  const updatedParagraph = completeItem(filename, content)
  // clo(updatedParagraph, `doCompleteTask -> updatedParagraph`) // ✅

  if (typeof updatedParagraph !== "boolean") {
    logDebug('doCompleteTask', `-> {${updatedParagraph.content
      }}`)
    return handlerResult(true, ['REMOVE_LINE_FROM_JSON','START_DELAYED_REFRESH_TIMER'], { updatedParagraph })
  } else {
    logDebug('doCompleteTask', `-> failed`)
    return handlerResult(false)
  }
}

/** 
 * Complete the task in the actual Note, but with the date it was scheduled for.
 * @param {MessageDataObject} data - The data object containing information for content update.
 * @returns {TBridgeClickHandlerResult} The result of the content update operation.
 */
export function doCompleteTaskThen(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  const updatedParagraph = completeItemEarlier(filename, content)
  if (typeof updatedParagraph !== "boolean") {
    logDebug('doCompleteTaskThen', `-> {${updatedParagraph.content
      }}`)
    return handlerResult(true, ['REMOVE_LINE_FROM_JSON', 'START_DELAYED_REFRESH_TIMER'], { updatedParagraph })
  } else {
    logDebug('doCompleteTaskThen', `-> failed`)
    return handlerResult(false)
  }
}

/** 
 * Cancel the task in the actual Note.
 * @param {MessageDataObject} data - The data object containing information for content update.
 * @returns {TBridgeClickHandlerResult} The result of the content update operation.
 */
export function doCancelTask(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  let res = cancelItem(filename, content)
  let updatedParagraph = null
  const possiblePara = findParaFromStringAndFilename(filename, content)
  if (typeof possiblePara === 'boolean') {
    res = false
  } else {
    updatedParagraph = possiblePara || {}
  }
  logDebug('doCancelTask', `-> ${String(res)}`)
  return handlerResult(res, ['REMOVE_LINE_FROM_JSON', 'START_DELAYED_REFRESH_TIMER'], { updatedParagraph })
}

/** 
 * Complete the checklist in the actual Note.
 * @param {MessageDataObject} data - The data object containing information for content update.
 * @returns {TBridgeClickHandlerResult} The result of the content update operation.
 */
export function doCompleteChecklist(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  const updatedParagraph = completeItem(filename, content)
  // clo(updatedParagraph, `doCompleteChecklist -> updatedParagraph`)
  // clo(updatedParagraph.note.filename, `doCompleteChecklist -> updatedParagraph.note.filename`)
  return handlerResult(Boolean(updatedParagraph), ['REMOVE_LINE_FROM_JSON', 'START_DELAYED_REFRESH_TIMER'], { updatedParagraph })
}

/** 
 * Delete the item in the actual Note.
 * TODO: extend to delete sub-items as well if wanted.
 * @param {MessageDataObject} data - The data object containing information for content update.
 * @returns {TBridgeClickHandlerResult} The result of the content update operation.
 */
export async function doDeleteItem(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
  const { filename, content, sectionCodes } = validateAndFlattenMessageObject(data)
  logDebug('doDeleteItem', `Starting with "${String(content)}" and will ideally update sectionCodes ${String(sectionCodes)}`)
  // Grab a copy of the paragraph before deleting it, so React can remove the right line. (It's not aware the paragraph has disappeared on the back end.)
  const updatedParagraph = findParaFromStringAndFilename(filename, content)
  const res = await deleteItem(filename, content)
  logDebug('doDeleteItem', `-> ${String(res)}`)
  return handlerResult(true, ['REMOVE_LINE_FROM_JSON', 'START_DELAYED_REFRESH_TIMER'], { updatedParagraph })
}

/** 
 * Cancel the checklist in the actual Note.
 * @param {MessageDataObject} data - The data object containing information for content update.
 * @returns {TBridgeClickHandlerResult} The result of the content update operation.
 */ 
export function doCancelChecklist(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  let res = cancelItem(filename, content)
  let updatedParagraph = null
  const possiblePara = findParaFromStringAndFilename(filename, content)
  if (typeof possiblePara === 'boolean') {
    res = false
  } else {
    updatedParagraph = possiblePara || {}
  }
  // logDebug('doCancelChecklist', `-> ${String(res)}`)
  return handlerResult(res, ['REMOVE_LINE_FROM_JSON', 'START_DELAYED_REFRESH_TIMER'], { updatedParagraph })
}

/**
 * Updates content based on provided data.
 * @param {MessageDataObject} data - The data object containing information for content update.
 * @returns {TBridgeClickHandlerResult} The result of the content update operation.
 */
export function doContentUpdate(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  const { updatedContent } = data
  logDebug('doContentUpdate', `${updatedContent || ''}`)
  if (!updatedContent) {
    throw new Error('Trying to updateItemContent but no updatedContent was passed')
  }

  const para = findParaFromStringAndFilename(filename, content)

  if (!para) {
    throw new Error(`updateItemContent: No para found for filename ${filename} and content ${content}`)
  }

  para.content = updatedContent
  if (para.note) {
    para.note.updateParagraph(para)
  } else {
    throw new Error(`updateItemContent: No para.note found for filename ${filename} and content ${content}`)
  }

  return handlerResult(true, ['UPDATE_LINE_IN_JSON','START_DELAYED_REFRESH_TIMER'], { updatedParagraph: para })
}

// Send a request to toggleType to plugin
export function doToggleType(data: MessageDataObject): TBridgeClickHandlerResult {
  try {
    const { filename, content, sectionCodes } = validateAndFlattenMessageObject(data)
    logDebug('toggleTaskChecklistParaType', `starting for "${content}" in filename: ${filename} with sectionCodes ${String(sectionCodes)}`)

    // V1: original from v0.x
    // const updatedType = toggleTaskChecklistParaType(filename, content)

    // V2: move most of toggleTaskChecklistParaType() into here, as we need access to the full para
    // find para
    const possiblePara: TParagraph | boolean = findParaFromStringAndFilename(filename, content)
    if (typeof possiblePara === 'boolean') {
      throw new Error('toggleTaskChecklistParaType: no para found')
    }
    // logDebug('toggleTaskChecklistParaType', `toggling type for "${content}" in filename: ${filename}`)
    // Get the paragraph to change
    const updatedParagraph = possiblePara
    const thisNote = updatedParagraph.note
    if (!thisNote) throw new Error(`Could not get note for filename ${filename}`)
    const existingType = updatedParagraph.type
    logDebug('toggleTaskChecklistParaType', `toggling type from ${existingType} in filename: ${filename}`)
    const updatedType = (existingType === 'checklist') ? 'open' : 'checklist'
    updatedParagraph.type = updatedType
    logDebug('doToggleType', `-> ${updatedType}`)
    thisNote.updateParagraph(updatedParagraph)
    DataStore.updateCache(thisNote, false)
    // Refresh the whole section, as we might want to filter out the new item type from the display
    // return handlerResult(true, ['UPDATE_LINE_IN_JSON', 'START_DELAYED_REFRESH_TIMER'], { updatedParagraph: updatedParagraph })
    return handlerResult(true, ['REFRESH_SECTION_IN_JSON', 'START_DELAYED_REFRESH_TIMER'], { sectionCodes: sectionCodes })

  } catch (error) {
    logError('doToggleType', error.message)
    return handlerResult(false)
  }
}

// Send a request to unscheduleItem to plugin
export function doUnscheduleItem(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  const updatedParagraph = unscheduleItem(filename, content)
  logDebug('doUnscheduleItem', `-> ${String(updatedParagraph)}`)

  // logDebug('doUnscheduleItem', `  -> result ${String(res)}`)
  // Update display in Dashboard too
  // sendToHTMLWindow(windowId, 'unscheduleItem', data)
  return handlerResult(true, ['UPDATE_LINE_IN_JSON','START_DELAYED_REFRESH_TIMER'], { updatedParagraph: updatedParagraph })
}

// Send a request to cyclePriorityStateUp to plugin
export function doCyclePriorityStateUp(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)

  // Get para
  const para = findParaFromStringAndFilename(filename, content)
  if (para && typeof para !== 'boolean') {
    // const paraContent = para.content ?? 'error'
    // logDebug('doCyclePriorityStateUp', `will cycle priority on para {${paraContent}}`)
    // Note: next 2 lines have to be this way around, otherwise a race condition
    // const newPriority = (getTaskPriority(paraContent) + 1) % 5
    const updatedContent = cyclePriorityStateUp(para)
    para.content = updatedContent
    logDebug('doCyclePriorityStateUp', `cycling priority -> {${JSP(updatedContent)}}`)

    // Now ask to update this line in the display
    return handlerResult(true, ['UPDATE_LINE_IN_JSON'], { updatedParagraph: para })
  } else {
    logWarn('doCyclePriorityStateUp', `-> unable to find para {${content}} in filename ${filename}`)
    return handlerResult(false)
  }
}

// Send a request to cyclePriorityStateDown to plugin
export function doCyclePriorityStateDown(data: MessageDataObject): TBridgeClickHandlerResult {
  const { filename, content } = validateAndFlattenMessageObject(data)
  // Get para
  const para = findParaFromStringAndFilename(filename, content)
  if (para && typeof para !== 'boolean') {
    // const paraContent = para.content ?? 'error'
    // logDebug('doCyclePriorityStateDown', `will cycle priority on para {${paraContent}}`)
    // Note: next 2 lines have to be this way around, otherwise a race condition
    // const newPriority = (getTaskPriority(paraContent) - 1) % 5
    const updatedContent = cyclePriorityStateDown(para)
    para.content = updatedContent
    logDebug('doCyclePriorityStateDown', `cycling priority -> {${updatedContent}}`)

    // Now ask to update this line in the display
    return handlerResult(true, ['UPDATE_LINE_IN_JSON'], { updatedParagraph: para })
  } else {
    logWarn('doCyclePriorityStateDown', `-> unable to find para {${content}} in filename ${filename}`)
    return handlerResult(false)
  }
}

// TODO(later): get working or remove
// export function dowindowResized(data: MessageDataObject): TBridgeClickHandlerResult {
//   logDebug('bCDI / windowResized', `windowResized triggered on plugin side (hopefully for '${windowCustomId}')`)
//   const thisWin = getWindowFromCustomId(windowCustomId)
//   const rect = getLiveWindowRectFromWin(thisWin)
//   if (rect) {
//     // logDebug('bCDI / windowResized/windowResized', `-> saving rect: ${rectToString(rect)} to pref`)
//     storeWindowRect(windowCustomId)
//   }
// }

// Handle a show note call simply by opening the note in the main Editor.
// Note: use the showLine... variant of this (below) where possible
export async function doShowNoteInEditorFromFilename(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
  const { filename, modifierKey } = data
  if (!filename) throw 'doShowNoteInEditorFromFilename: No filename: stopping'
  const note = await openNoteByFilename(filename, { newWindow: modifierKey==='meta', splitView: modifierKey==='alt' } )
  return handlerResult(note ? true : false)
}

// Handle a show note call simply by opening the note in the main Editor
// Note: use the showLine... variant of this (below) where possible
export async function doShowNoteInEditorFromTitle(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
  const { filename } = validateAndFlattenMessageObject(data)
  // Note: different from above as the third parameter is overloaded to pass wanted note title (encoded)
  const wantedTitle = filename
  const note = await Editor.openNoteByTitle(wantedTitle)
  if (note) {
    logDebug('bridgeClickDashboardItem', `-> successful call to open title ${wantedTitle} in Editor`)
    return handlerResult(true)
  } else {
    logWarn('bridgeClickDashboardItem', `-> unsuccessful call to open title ${wantedTitle} in Editor`)
    return handlerResult(false)
  }
}

// Handle a show line call by opening the note in the main Editor, and then finding and moving the cursor to the start of that line
export async function doShowLineInEditorFromFilename(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
  const { filename, content, modifierKey } = validateAndFlattenMessageObject(data)
  // logDebug('showLineInEditorFromFilename', `${filename} /  ${content}`)
  const note = await Editor.openNoteByFilename(filename, modifierKey==='meta',0,0,modifierKey==='alt')
  if (note) {
    const res = highlightParagraphInEditor({ filename: filename, content: content }, true)
    logDebug(
      'bridgeClickDashboardItem',
      `-> successful call to open filename ${filename} in Editor, followed by ${res ? 'succesful' : 'unsuccessful'} call to highlight the paragraph in the editor`,
    )
    return handlerResult(true)
  } else {
    logWarn('bridgeClickDashboardItem', `-> unsuccessful call to open filename ${filename} in Editor`)
    return handlerResult(false)
  }
}

// Handle a show line call by opening the note in the main Editor, and then finding and moving the cursor to the start of that line
// TODO: is this still needed?
export async function doShowLineInEditorFromTitle(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
  // Note: different from above as the third parameter is overloaded to pass wanted note title (encoded)
  const { title, filename, content } = validateAndFlattenMessageObject(data)
  const note = await Editor.openNoteByTitle(title)
  if (note) {
    const res = highlightParagraphInEditor({ filename: note.filename, content: content }, true)
    logDebug(
      'bridgeClickDashboardItem',
      `-> successful call to open filename ${filename} in Editor, followed by ${res ? 'succesful' : 'unsuccessful'} call to highlight the paragraph in the editor`,
    )
    return handlerResult(true)
  } else {
    logWarn('bridgeClickDashboardItem', `-> unsuccessful call to open title '${title}' in Editor`)
    return handlerResult(false)
  }
}

// Instruction to move task from a note to a project note.
// Note: Requires user input, so most of the work is done in moveItemToRegularNote() on plugin side.
export async function doMoveToNote(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
  const { filename, content, itemType, para } = validateAndFlattenMessageObject(data)
  logDebug('doMoveToNote', `starting -> ${filename} / ${content} / ${itemType}`)
  const newNote: TNote|null|void = await moveItemToRegularNote(filename, content, itemType)
  if (newNote) {
    logDebug('doMoveToNote', `Success: moved to -> "${newNote?.title||''}"`)
    logDebug('doMoveToNote', `- now needing to find the TPara for ${para.type}:"${content}" ...`)
    // updatedParagraph (below) is an actual NP object (TParagraph) not a TParagraphForDashboard, so we need to go and find it again
    const updatedParagraph = newNote.paragraphs.find((p) => p.content === content && p.type === para.type)
    if (updatedParagraph) {
      logDebug('doMoveToNote', `- Sending update line request $JSP(updatedParagraph)`)
      return handlerResult(true, ['UPDATE_LINE_IN_JSON'], { updatedParagraph })
    } else {
      logWarn('doMoveToNote', `Couldn't find updated paragraph. Resorting to refreshing all sections :-(`)
      return handlerResult(true, ['REFRESH_ALL_SECTIONS'], { sectionCodes: allCalendarSectionCodes })
    }
  } else {
    return handlerResult(false)
  }
}

/**
 * Reschedule (i.e. update the >date) an item in place
 * The new date is indicated by the controlStr ('t' or date interval),
 * or failing that the dateString (an NP date)
 * @param {MessageDataObject} data for the item
 * @param {string?} npDateStrIn optional NP date string
 * @returns {TBridgeClickHandlerResult} how to handle this result
 */
export async function doUpdateTaskDate(data: MessageDataObject, npDateStrIn: string = ''): Promise<TBridgeClickHandlerResult> {
  const { filename, content, controlStr } = validateAndFlattenMessageObject(data)
  const config = getDashboardSettings()
  // logDebug('doUpdateTaskDate', `- config.rescheduleNotMove = ${config.rescheduleNotMove}`)
  logDebug('doUpdateTaskDate', `Starting with filename: ${filename}, content: "${content}", controlStr: ${controlStr}`)
  const dateOrInterval = String(controlStr)
  // const dateInterval = controlStr || ''
  let startDateStr = ''
  let newDateStr = ''

  const thePara = findParaFromStringAndFilename(filename, content)
  if (typeof thePara === 'boolean') {
    logWarn('doUpdateTaskDate', `- note ${filename} doesn't seem to contain {${content}}`)
    clo(data, `doUpdateTaskDate -> data`)
    await showMessage(`Note ${filename} doesn't seem to contain "{${content}}"`)
    return handlerResult(false)
  }

  if (dateOrInterval === 't') {
    // Special case to change to '>today' (or the actual date equivalent)
    newDateStr = config.useTodayDate ? 'today' : getTodaysDateHyphenated()
    logDebug('doUpdateTaskDate', `- move task in ${filename} -> 'today'`)
  } else if (dateOrInterval.match(RE_DATE_INTERVAL)) {
    const dateInterval = dateOrInterval
    const offsetUnit = dateInterval.charAt(dateInterval.length - 1) // get last character
    // Get today's date, ignoring current date on task. Note: this means we always start with a *day* base date, not week etc.
    startDateStr = getTodaysDateHyphenated()
    // Get the new date, but output using the longer of the two types of dates given
    newDateStr = calcOffsetDateStr(startDateStr, dateInterval, 'longer')

    // But, we now know the above doesn't observe NP week start, so override with an NP-specific function where offset is of type 'week'
    if (offsetUnit === 'w') {
      const offsetNum = Number(dateInterval.substr(0, dateInterval.length - 1)) // return all but last character
      // $FlowFixMe(incompatible-type)
      const NPWeekData: NotePlanWeekInfo = getNPWeekData(startDateStr, offsetNum, 'week')
      // clo(NPWeekData, "NPWeekData:")
      newDateStr = NPWeekData.weekString
      logDebug('doUpdateTaskDate', `- used NPWeekData instead -> ${newDateStr}`)
    }
  } else if (dateOrInterval.match(RE_DATE)) {
    newDateStr = controlStr
    logDebug('doUpdateTaskDate', `- newDateStr ${newDateStr} from controlStr`)
  } else {
    logError('doUpdateTaskDate', `bad move date/interval: ${dateOrInterval}`)
    return handlerResult(false)
  }
  logDebug('doUpdateTaskDate', `change due date on task from ${startDateStr} -> ${newDateStr}`)

  // Make the actual change to reschedule the item
  const theLine = thePara.content
  const changedLine = replaceArrowDatesInString(thePara.content, `>${newDateStr}`)
  logDebug('doUpdateTaskDate', `Found line "${theLine}" -> changed line: "${changedLine}"`)
  thePara.content = changedLine
  const thisNote = thePara.note
  if (thisNote) {
    thisNote.updateParagraph(thePara)
    logDebug('doUpdateTaskDate', `- appeared to update line OK -> {${changedLine}}`)

    // Ask for cache refresh for this note
    DataStore.updateCache(thisNote, false)

    // refresh whole display, as we don't know which if any section the moved task might need to be added to
    // logDebug('doUpdateTaskDate', `------------ refresh ------------`)
    return handlerResult(true, ['REMOVE_LINE_FROM_JSON', 'REFRESH_ALL_SECTIONS'], { updatedParagraph: thePara })
  } else {
    logWarn('doUpdateTaskDate', `- some other failure`)
    return handlerResult(false)
  }
}
/**
 * Update a single key in DataStore.settings
 * @param {MessageDataObject} data - a MDO that should have a key "settings" with the items to be set to the settingName key
 * @param {string} settingName - the single key to set to the value of data.settings
 * @returns {TBridgeClickHandlerResult}
 */
export function doSettingsChanged(data: MessageDataObject, settingName: string): TBridgeClickHandlerResult {
  // clo(data, `doSettingsChanged -> data`)
  const newSettings = data.settings
  if (!DataStore.settings || !newSettings) {
    throw new Error(`doSettingsChanged newSettings: ${JSP(newSettings)} or settings is null or undefined.`)
  }
  const combinedUpdatedSettings = { ...DataStore.settings, [settingName]: newSettings }
  // logLevel is a special case that we need to specifically update in DataStore
  // so that plugin-side functions that log can pick it up even before React is ready
  if (newSettings._logLevel && newSettings._logLevel !== DataStore.settings._logLevel) {
    combinedUpdatedSettings._logLevel =  newSettings._logLevel
    logDebug('doSettingsChanged', `key "_logLevel" saved in DataStore.settings; new value is: ${newSettings._logLevel}`)
  }
  logDebug('doSettingsChanged', `saving key "${settingName}" in DataStore.settings`)
  DataStore.settings = combinedUpdatedSettings
  return handlerResult(true, ['REFRESH_ALL_SECTIONS'])
}

// export async function doSetSpecificDate(data: MessageDataObject): Promise<TBridgeClickHandlerResult> {
//   // const { dateString, itemType, filename } = validateAndFlattenMessageObject(data)
//   throw (`doSetSpecificDate -> shouldn't be called for data:${JSP(data)}`)
// }
