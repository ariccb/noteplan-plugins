// @flow
//-----------------------------------------------------------------------------
// Bridging functions for Dashboard plugin
// Last updated 2024-07-08 for v2.0.1 by @jgclark
//-----------------------------------------------------------------------------

import pluginJson from '../plugin.json'

// import { addChecklistToNoteHeading, addTaskToNoteHeading } from '../../jgclark.QuickCapture/src/quickCapture'
// import { finishReviewForNote, skipReviewForNote } from '../../jgclark.Reviews/src/reviews'
import { allSectionCodes } from "./constants"
import {
  doAddItem,
  doCancelChecklist,
  doCancelTask,
  doContentUpdate,
  doCompleteTask,
  doCompleteTaskThen,
  doCompleteChecklist,
  doCyclePriorityStateDown,
  doCyclePriorityStateUp,
  doDeleteItem,
  doMoveToNote,
  doSettingsChanged,
  doShowNoteInEditorFromFilename,
  doShowNoteInEditorFromTitle,
  doShowLineInEditorFromFilename,
  doShowLineInEditorFromTitle,
  // doSetSpecificDate,
  doToggleType,
  doUnscheduleItem,
  doUpdateTaskDate,
  // refreshAllSections,
  refreshSomeSections,
  incrementallyRefreshSections,
} from './clickHandlers'
import {
  doAddProgressUpdate,
  doCancelProject,
  doCompleteProject,
  doTogglePauseProject,
  doReviewFinished,
  doSetNewReviewInterval,
  doSetNextReviewDate,
  doStartReviews,
} from './projectClickHandlers'
import {
  doMoveFromCalToCal,
  scheduleAllOverdueOpenToToday,
  scheduleAllTodayTomorrow,
  scheduleAllYesterdayOpenToToday,
} from './moveClickHandlers'
import { getDashboardSettings, makeDashboardParas } from './dashboardHelpers'
import { showDashboardReact } from './reactMain' // TODO: fix circ dep here
import {
  copyUpdatedSectionItemData, findSectionItems,
} from './dataGeneration'
import type { MessageDataObject, TActionType, TBridgeClickHandlerResult, TParagraphForDashboard, TPluginCommandSimplified } from './types'
import { clo, logDebug, logError, logInfo, logWarn, JSP } from '@helpers/dev'
import {
  sendToHTMLWindow, getGlobalSharedData,
  // updateGlobalSharedData
} from '@helpers/HTMLView'
import {
  // projectNotesSortedByChanged,
  getNoteByFilename
} from '@helpers/note'
import { formatReactError } from '@helpers/react/reactDev'

//-----------------------------------------------------------------
// Data types + constants

// type SettingDataObject = { settingName: string, state: string }

const windowCustomId = `${pluginJson['plugin.id']}.main` // TODO(later): update me
const WEBVIEW_WINDOW_ID = windowCustomId

//-----------------------------------------------------------------

/**
 * HTML View requests running a plugin command
 * TODO(@dbw): can this be removed -- there's something with the same name in np.Shared/Root.jsx
 * @param {TPluginCommandSimplified} data object with plugin details
 */
export async function runPluginCommand(data: TPluginCommandSimplified) {
  try {
    // clo(data, 'runPluginCommand received data object')
    logDebug('pluginToHTMLBridge/runPluginCommand', `running ${data.commandName} in ${data.pluginID}`)
    await DataStore.invokePluginCommandByName(data.commandName, data.pluginID, data.commandArgs)
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Somebody clicked on a something in the HTML React view
 * NOTE: processActionOnReturn will be called for each item after the CASES based on TBridgeClickHandlerResult
 * @param {MessageDataObject} data - details of the item clicked
 */
export async function bridgeClickDashboardItem(data: MessageDataObject) {
  try {
    // const windowId = getWindowIdFromCustomId(windowCustomId);
    // if (!windowId) {
    //   logError('bridgeClickDashboardItem', `Can't find windowId for ${windowCustomId}`)
    //   return
    // }

    // const ID = data.item?.ID ?? '<no ID found>'
    const actionType: TActionType = data.actionType
    const logMessage = data.logMessage ?? ''
    const filename = data.item?.para?.filename ?? '<no filename found>'
    let content = data.item?.para?.content ?? '<no content found>'
    const updatedContent = data.updatedContent ?? ''
    let result: TBridgeClickHandlerResult = { success: false } // use this for each call and return a TBridgeClickHandlerResult object

    logDebug(`***************** bridgeClickDashboardItem: ${actionType}${logMessage?`: "${logMessage}"`:''} *****************`)
    // clo(data.item, 'bridgeClickDashboardItem received data object; data.item=')
    if (!actionType === 'refresh' && (!content || !filename)) throw new Error('No content or filename provided for refresh')

    // Allow for a combination of button click and a content update
    if (updatedContent && data.actionType !== 'updateItemContent') {
      logDebug('bCDI', `content updated with another button press; need to update content first; new content: "${updatedContent}"`)
      // $FlowIgnore[incompatible-call]
      result = doContentUpdate(data)
      if (result.success) {
        // update the content so it can be found in the cache now that it's changed - this is for all the cases below that don't use data for the content - TODO(later): ultimately delete this
        content = result.updatedParagraph?.content ?? ''
        // update the data object with the new content so it can be found in the cache now that it's changed - this is for jgclark's new handlers that use data instead
        data.item?.para?.content ? data.item.para.content = content : null
        logDebug('bCDI / updateItemContent', `-> successful call to doContentUpdate()`)
        // await updateReactWindowFromLineChange(result, data, ['para.content'])
      }
    }

    switch (actionType) {
      case 'refresh': {
        // await refreshAllSections()
        await incrementallyRefreshSections({ ...data, sectionCodes: allSectionCodes }, false, true)
        break
      }
      case 'windowReload': {
        showDashboardReact()
        return
      }
      case 'completeTask': {
        result = doCompleteTask(data)
        break
      }
      case 'completeTaskThen': {
        result = doCompleteTaskThen(data)
        break
      }
      case 'cancelTask': {
        result = doCancelTask(data)
        break
      }
      case 'completeChecklist': {
        result = doCompleteChecklist(data)
        break
      }
      case 'cancelChecklist': {
        result = doCancelChecklist(data)
        break
      }
      case 'deleteItem': {
        result = await doDeleteItem(data)
        break
      }
      case 'unscheduleItem': {
        result = await doUnscheduleItem(data)
        break
      }
      case 'updateItemContent': {
        result = doContentUpdate(data)
        break
      }
      case 'toggleType': {
        result = await doToggleType(data)
        break
      }
      case 'cyclePriorityStateUp': {
        result = await doCyclePriorityStateUp(data)
        break
      }
      case 'cyclePriorityStateDown': {
        result = await doCyclePriorityStateDown(data)
        break
      }
      case 'setNextReviewDate': {
        result = await doSetNextReviewDate(data)
        break
      }
      case 'reviewFinished': {
        result = await doReviewFinished(data)
        break
      }
      case 'startReviews': {
        result = await doStartReviews()
        break
      }
      case 'cancelProject': {
        result = await doCancelProject(data)
        break
      }
      case 'completeProject': {
        result = await doCompleteProject(data)
        break
      }
      case 'togglePauseProject': {
        result = await doTogglePauseProject(data)
        break
      }
      case 'setNewReviewInterval': {
        result = await doSetNewReviewInterval(data)
        break
      }
      case 'addProgress': {
        result = await doAddProgressUpdate(data)
        break
      }
      // case 'windowResized': {
      // TODO(later: work on this
      // result = await doWindowResized()
      // break
      // }
      case 'showNoteInEditorFromFilename': {
        result = await doShowNoteInEditorFromFilename(data)
        break
      }
      case 'showNoteInEditorFromTitle': {
        result = await doShowNoteInEditorFromTitle(data)
        break
      }
      case 'showLineInEditorFromFilename': {
        result = await doShowLineInEditorFromFilename(data)
        break
      }
      case 'showLineInEditorFromTitle': {
        result = await doShowLineInEditorFromTitle(data)
        break
      }
      case 'moveToNote': {
        result = await doMoveToNote(data)
        break
      }
      case 'moveFromCalToCal': {
        result = await doMoveFromCalToCal(data)
        break
      }
      case 'updateTaskDate': {
        result = await doUpdateTaskDate(data)
        break
      }
      case 'reactSettingsChanged': {
        // $FlowIgnore
        if (typeof data.settings !== 'string') data.settings = JSON.stringify(data.settings)
        result = await doSettingsChanged(data, 'reactSettings')
        break
      }
      case 'dashboardSettingsChanged': {
        // $FlowIgnore
        if (typeof data.settings !== 'string') data.settings = JSON.stringify(data.settings)
        result = await doSettingsChanged(data, 'dashboardSettings')
        break
      }
      // case 'setSpecificDate': {
      //   result = await doSetSpecificDate(data)
      //   break
      // }
      case 'refreshSomeSections': {
        result = await refreshSomeSections(data)
        break
      }
      case 'incrementallyRefreshSections': {
        result = await incrementallyRefreshSections(data)
        break
      }
      case 'addChecklist': {
        result = await doAddItem(data)
        break
      }
      case 'addTask': {
        result = await doAddItem(data)
        break
      }
      case 'moveAllTodayToTomorrow': {
        result = await scheduleAllTodayTomorrow(data)
        break
      }
      case 'moveAllYesterdayToToday': {
        result = await scheduleAllYesterdayOpenToToday(data)
        break
      }
      case 'scheduleAllOverdueToday': {
        result = await scheduleAllOverdueOpenToToday(data)
        break
      }
      default: {
        logWarn('bridgeClickDashboardItem', `bridgeClickDashboardItem: can't yet handle type ${actionType}`)
      }
    }

    if (result) {
      await processActionOnReturn(result, data) // process all actions based on result of handler
      // await sendToHTMLWindow(WEBVIEW_WINDOW_ID, 'SHOW_BANNER', {msg:"Action processed\n\n\n\n\nYASSSSS" })
    } else {
      logWarn('bCDI', `false result from call`)
    }

  } catch (error) {
    logError(pluginJson, `pluginToHTMLBridge / bridgeClickDashboardItem: ${JSP(error)}`)
  }
}

/**
 * One function to handle all actions on return from the various handlers
 * An attempt to reduce duplicated code in each
 * @param {TBridgeClickHandlerResult} handlerResult
 * @param {MessageDataObject} data
 */
async function processActionOnReturn(handlerResult: TBridgeClickHandlerResult, data: MessageDataObject) {
  try {
    // check to see if the theme has changed and if so, update it
    await checkForMobile()
    await checkForThemeChange()
    if (!handlerResult) return

    const actionsOnSuccess = handlerResult.actionsOnSuccess ?? []
    if (!actionsOnSuccess.length) {
      logDebug('processActionOnReturn', `note: no post process actions to perform`)
      return
    }
    const { success, updatedParagraph } = handlerResult
    const isProject = data.item?.itemType === 'project'
    const actsOnALine = actionsOnSuccess.some(str => str.includes("LINE"))

    const filename: string = isProject ? data.item?.project?.filename ?? '' : data.item?.para?.filename ?? ''
    logDebug('processActionOnReturn', isProject ? `PROJECT: ${data.item?.project?.title || 'no project title'}` : `TASK: updatedParagraph "${updatedParagraph?.content ?? 'N/A'}"`)
    if (actsOnALine && filename === '') {
      logWarn('processActionOnReturn', `Starting with no filename`)
    }

    if (success) {
      if (filename !== '') {
        // update the cache for the note, as it might have changed
        const _updatedNote = await DataStore.updateCache(getNoteByFilename(filename), false) /* Note: added await in case Eduard makes it an async at some point */
      }
      if (actionsOnSuccess.includes('REMOVE_LINE_FROM_JSON')) {
        logDebug('processActionOnReturn', `REMOVE_LINE_FROM_JSON: calling updateReactWindowFLC() for ID:${data?.item?.ID||''} ${data.item?.project ? 'project:"${data.item?.project.title}"' : `task:"${data?.item?.para?.content||''}"`}`)
        await updateReactWindowFromLineChange(handlerResult, data, [])
      }
      if (actionsOnSuccess.includes('UPDATE_LINE_IN_JSON')) {
        if (isProject) {
          logDebug('processActionOnReturn', `UPDATE_LINE_IN_JSON for Project '${filename}': calling updateReactWindowFLC()`)
          await updateReactWindowFromLineChange(handlerResult, data, ['filename', 'itemType', 'project'])
        } else {
          logDebug('processActionOnReturn', `UPDATE_LINE_IN_JSON for non-Project: {${updatedParagraph?.content ?? '(no content)'}}: calling updateReactWindowFLC()`)
          await updateReactWindowFromLineChange(handlerResult, data, ['filename', 'itemType', 'para'])
        }
      }
      if (actionsOnSuccess.includes('REFRESH_ALL_SECTIONS')) {
        logDebug('processActionOnReturn', `REFRESH_ALL_SECTIONS: calling incrementallyRefreshSections()`)
        // await refreshAllSections() // this works fine
        await incrementallyRefreshSections({ ...data, sectionCodes: allSectionCodes })
      }
      if (actionsOnSuccess.includes('REFRESH_ALL_CALENDAR_SECTIONS')) {
        const wantedsectionCodes = ['DT', 'DY', 'DO', 'W', 'M', 'Q']
        for (const sectionCode of wantedsectionCodes) {
          // await refreshSomeSections({ ...data, sectionCodes: [sectionCode] })
          await incrementallyRefreshSections({ ...data, sectionCodes: [sectionCode] })
        }
      }
      if (actionsOnSuccess.includes('REFRESH_SECTION_IN_JSON')) {
        const wantedsectionCodes = handlerResult.sectionCodes ?? []
        if (!wantedsectionCodes?.length) logError('processActionOnReturn', `REFRESH_SECTION_IN_JSON: no sectionCodes provided`)
        logDebug('processActionOnReturn', `REFRESH_SECTION_IN_JSON: calling getSomeSectionsData(['${String(wantedsectionCodes)}']`)
        // await refreshSomeSections({ ...data, sectionCodes: wantedsectionCodes })
        await incrementallyRefreshSections({ ...data, sectionCodes: wantedsectionCodes })
      }
      if (actionsOnSuccess.includes('START_DELAYED_REFRESH_TIMER')) {
        logDebug('processActionOnReturn', `START_DELAYED_REFRESH_TIMER: setting startDelayedRefreshTimer in pluginData`)
        const reactWindowData = await getGlobalSharedData(WEBVIEW_WINDOW_ID)
        reactWindowData.pluginData.startDelayedRefreshTimer = true
        await sendToHTMLWindow(WEBVIEW_WINDOW_ID, 'UPDATE_DATA', reactWindowData, `Setting startDelayedRefreshTimer`)
      }
    } else {
      logDebug('processActionOnReturn', `-> failed handlerResult`)
    }
  } catch (error) {
    logError('processActionOnReturn', `error: ${JSP(error)}: \n${JSP(formatReactError(error))}`)
    clo(data.item, `- data.item at error:`)
  }
}

/**
 * Update React window data based on the result of handling item content update.
 * @param {TBridgeClickHandlerResult} res The result of handling item content update.
 * @param {MessageDataObject} data The data of the item that was updated.
 * @param {Array<string>} fieldPathsToUpdate The field paths to update in React window data -- paths are in SectionItem fields (e.g. "ID" or "para.content")
 */
export async function updateReactWindowFromLineChange(handlerResult: TBridgeClickHandlerResult, data: MessageDataObject, fieldPathsToUpdate: Array<string>): Promise<void> {
  clo(handlerResult, 'updateReactWindowFLC: handlerResult')
  const { errorMsg, success, updatedParagraph } = handlerResult
  const actionsOnSuccess = handlerResult.actionsOnSuccess ?? []
  const shouldRemove = actionsOnSuccess.includes('REMOVE_LINE_FROM_JSON')
  const { ID } = data.item ?? { ID: '?' }
  // clo(handlerResult.updatedParagraph, 'updateReactWindowFLC: handlerResult.updatedParagraph:')
  if (!success) {
    logWarn('updateReactWindowFLC', `failed, so won't update window; handlerResult: ${JSP(handlerResult)} data: ${JSP(data)}`)
    throw `updateReactWindowFLC: failed to update item: ID ${ID}: ${errorMsg || ''}`
  }
  const reactWindowData = await getGlobalSharedData(WEBVIEW_WINDOW_ID)
  let sections = reactWindowData.pluginData.sections
  const isProject = data.item?.itemType === "project"

  if (updatedParagraph) {
    logDebug(`updateReactWindowFromLineChange`, ` -> updatedParagraph: "${updatedParagraph.content}"`)
    const { content: oldContent = '', filename: oldFilename = '' } = data.item?.para ?? { content: 'error', filename: 'error' }
    const newPara: TParagraphForDashboard = makeDashboardParas([updatedParagraph])[0]
    // get a reference so we can overwrite it later
    // find all references to this content (could be in multiple sections)
    const indexes = findSectionItems(sections, ['itemType', 'para.filename', 'para.content'], {
      itemType: /open|checklist/,
      'para.filename': oldFilename,
      'para.content': oldContent,
    })

    if (indexes.length) {
      const { sectionIndex, itemIndex } = indexes[0] // GET FIRST ONE FOR CLO DEBUGGING
      // clo(indexes, 'updateReactWindowFLC: indexes to update')
      // clo(sections[sectionIndex].sectionItems[itemIndex], `updateReactWindowFLC OLD/EXISTING JSON item ${ID} sections[${sectionIndex}].sectionItems[${itemIndex}]`)
      if (shouldRemove) {
        logDebug('updateReactWindowFLC', `-> removed item ${ID} from sections[${sectionIndex}].sectionItems[${itemIndex}]`)
        indexes.reverse().forEach((index) => {
          const { sectionIndex, itemIndex } = index
          sections[sectionIndex].sectionItems.splice(itemIndex, 1)
          // clo(sections[sectionIndex],`updateReactWindowFLC After splicing sections[${sectionIndex}]`)
        })
      } else {
        sections = copyUpdatedSectionItemData(indexes, fieldPathsToUpdate, { itemType: newPara.type, para: newPara }, sections) 
        clo(reactWindowData.pluginData.sections[sectionIndex].sectionItems[itemIndex], 'updateReactWindowFLC: NEW reactWindow JSON sectionItem before sending to window')
      }
    } else {
      logError('updateReactWindowFLC', `unable to find item to update: ID ${ID} : ${errorMsg || ''}`)
      throw `updateReactWindowFLC: unable to find item to update: ID ${ID} : ${errorMsg || ''}`
    }
    // update ID in data object
  } else if (isProject) {
    const projFilename = data.item?.project?.filename
    if (!projFilename) throw `updateReactWindowFLC: unable to find data.item.project.filename in ${JSP(data)}`
    const indexes = findSectionItems(sections, ['itemType', 'project.filename'], {
      itemType: "project",
      'project.filename': projFilename,
    })
    logDebug('', `- filename '${projFilename}' actions: ${String(actionsOnSuccess ?? '-')}`)
    clo(indexes, 'updateReactWindowFLC: indexes to update')
    if (shouldRemove) {
      indexes.reverse().forEach((index) => {
        const { sectionIndex, itemIndex } = index
        sections[sectionIndex].sectionItems.splice(itemIndex, 1)
        // clo(sections[sectionIndex],`updateReactWindowFLC After splicing sections[${sectionIndex}]`)
      })
    } else {
      logDebug('', `- doing something other than REMOVE_LINE. Assuming UPDATE_LINE_IN_JSON:`)
      sections = copyUpdatedSectionItemData(indexes, fieldPathsToUpdate, { itemType: newPara.type, para: newPara }, sections)
      // logError('updateReactWindowFLC', `Project type sent but not a remove action, but don't know how to do anything else yet. So cannot update react window content for: ID ${ID} | data: ${JSP(data)} |  ${errorMsg || ''}`)
    }
  } else {
    logError('updateReactWindowFLC', `no updatedParagraph param was supplied to updateReactWindowFromLineChange(). So cannot update react window content for: ID ${ID} | data: ${JSP(data)} |  ${errorMsg || ''}`)
    throw `updateReactWindowFLC: failed to update item: ID ${ID}: ${errorMsg || ''}`
  }
  await sendToHTMLWindow(WEBVIEW_WINDOW_ID, 'UPDATE_DATA', reactWindowData, `Single item updated on ID ${ID}`)
}

/**
 * Unfortunately, at the moment, there is no way to incrementally update data on iPad/iPhone
 * See See thread on [Discord](https://discord.com/channels/763107030223290449/1248860667956428822/1248860670179540993)
 * So after updates we have no choice but to do a full refresh of the window for now
 */
export function checkForMobile(): void {
  if (NotePlan.environment.platform !== 'macOS') {
    // await showDashboardReact('full')
    logDebug('checkForMobile', `Non-Desktop platform detected; continuing as normal...`)
  }
}

/**
 * Check to see if the theme has changed since we initially drew the winodw
 * This can happen when your computer goes from light to dark mode or you change the theme
 * We want the dashboard to always match
 */
export async function checkForThemeChange(): Promise<void> {
  const reactWindowData = await getGlobalSharedData(WEBVIEW_WINDOW_ID)
  const { pluginData } = reactWindowData
  const { themeName: themeInWindow } = pluginData
  const config = await getDashboardSettings()

  // logDebug('checkForThemeChange', `Editor.currentTheme: ${Editor.currentTheme?.name || '<no theme>'} config.dashboardTheme: ${config.dashboardTheme} themeInWindow: ${themeInWindow}`)
  // clo(NotePlan.editors.map((e,i)=>`"[${i}]: ${e?.title??''}": "${e.currentTheme.name}"`), 'checkForThemeChange: All NotePlan.editors themes')
  
  const currentTheme = (config.dashboardTheme ? config.dashboardTheme : Editor.currentTheme?.name || null)

  // logDebug('checkForThemeChange', `currentTheme: "${currentTheme}", themeInReactWindow: "${themeInWindow}"`)
  if (!currentTheme) {
    logDebug('checkForThemeChange', `currentTheme: "${currentTheme}", themeInReactWindow: "${themeInWindow}"`)
    return
  }
  if (currentTheme && currentTheme !== themeInWindow) {
    logDebug('checkForThemeChange', `theme changed from "${themeInWindow}" to "${currentTheme}"`)
    // Update the CSS in the window
    // The following doesn't work in practice ...
    // const themeCSS = generateCSSFromTheme()
    // await sendToHTMLWindow(WEBVIEW_WINDOW_ID, 'CHANGE_THEME', {themeCSS}, `Theme CSS Changed`)
    // reactWindowData.themeName = currentTheme // save the theme in the reactWindowData
    // await sendToHTMLWindow(WEBVIEW_WINDOW_ID, 'UPDATE_DATA', reactWindowData, `Theme Changed; Changing reactWindowData.themeName`)

    // ... so for now, force a reload instead
    await showDashboardReact('full')
  } 
}