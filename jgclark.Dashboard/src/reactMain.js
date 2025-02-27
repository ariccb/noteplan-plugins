// @flow
//-----------------------------------------------------------------------------
// Dashboard plugin main file (for React v2.0.0+)
// Last updated 2024-07-09 for v2.0.1 by @jgclark
//-----------------------------------------------------------------------------

// import moment from 'moment/min/moment-with-locales'
import pluginJson from '../plugin.json'
import type { TPluginData, TDashboardConfig } from './types'
import { allSectionDetails } from "./constants"
import { dashboardFilterDefs, dashboardSettingDefs } from "./dashboardSettings"
import { getDashboardSettings, getNotePlanSettings, getLogSettings, } from './dashboardHelpers'
import { buildListOfDoneTasksToday, getTotalDoneCounts, rollUpDoneCounts } from './countDoneTasks'
import {
  bridgeClickDashboardItem,
  // bridgeChangeCheckbox, runPluginCommand
} from './pluginToHTMLBridge'
// import type { TSection } from './types'
import { getAllSectionsData, getSomeSectionsData } from './dataGeneration'
import { clo, clof, JSP, logDebug, logError, logTimer, timer } from '@helpers/dev'
import { createPrettyRunPluginLink, createRunPluginCallbackUrl } from '@helpers/general'
import {
  getGlobalSharedData, sendToHTMLWindow,
  sendBannerMessage
} from '@helpers/HTMLView'
// import { toNPLocaleDateString } from '@helpers/NPdateTime'
import { checkForRequiredSharedFiles } from '@helpers/NPRequiredFiles'
import { generateCSSFromTheme } from '@helpers/NPThemeToCSS'
import { getWindowFromId } from '@helpers/NPWindows'
import { chooseOption, showMessage } from '@helpers/userInput'


export const WEBVIEW_WINDOW_ID = `${pluginJson['plugin.id']}.main` // will be used as the customId for your window

export type PassedData = {
  startTime?: Date /* used for timing/debugging */,
  title?: string /* React Window Title */,
  pluginData: any /* Your plugin's data to pass on first launch (or edited later) */,
  ENV_MODE?: 'development' | 'production',
  debug: boolean /* set based on ENV_MODE above */,
  returnPluginCommand: { id: string, command: string } /* plugin jsFunction that will receive comms back from the React window */,
  componentPath: string /* the path to the rolled up webview bundle. should be ../pluginID/react.c.WebView.bundle.* */,
  passThroughVars?: any /* any data you want to pass through to the React Window */,
  windowID?: string,
}

// const commsBridge = `
// <!-- commsBridge scripts -->
// <script type="text/javascript" src="../np.Shared/pluginToHTMLErrorBridge.js"></script>
// <script>
// /* you must set this before you import the CommsBridge file */
// const receivingPluginID = jgclark.Dashboard"; // the plugin ID of the plugin which will receive the comms from HTML
// // That plugin should have a function NAMED onMessageFromHTMLView (in the plugin.json and exported in the plugin's index.js)
// // this onMessageFromHTMLView will receive any arguments you send using the sendToPlugin() command in the HTML window

// /* the onMessageFromPlugin function is called when data is received from your plugin and needs to be processed. this function
//    should not do the work itself, it should just send the data payload to a function for processing. The onMessageFromPlugin function
//    below and your processing functions can be in your html document or could be imported in an external file. The only
//    requirement is that onMessageFromPlugin (and receivingPluginID) must be defined or imported before the pluginToHTMLCommsBridge
//    be in your html document or could be imported in an external file */
// </script>
// <script type="text/javascript" src="./HTMLWinCommsSwitchboard.js"></script>
// <script type="text/javascript" src="../np.Shared/pluginToHTMLCommsBridge.js"></script>
// `

// ------------------------------------------------------------

export async function showDemoDashboard(): Promise<void> {
  await showDashboardReact('full', true)
}

/**
 * x-callback entry point to change a single setting.
 * (Note: see also setSettings to do many at the same time.)
 * @param {string} key 
 * @param {string} value 
 * @example noteplan://x-callback-url/runPlugin?pluginID=jgclark.Dashboard&command=setSetting&arg0=rescheduleNotMove&arg1=true
 * @example noteplan://x-callback-url/runPlugin?pluginID=jgclark.Dashboard&command=setSetting&arg0=ignoreTasksWithPhrase&arg1=#waiting
 */
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    logDebug('setSetting', `Request to set: '${key}'' -> '${value}'`)
    const dashboardSettings = (await getDashboardSettings()) || {}
    const allSettings = [...dashboardFilterDefs, ...dashboardSettingDefs].filter(k => k.label && k.key)
    const allKeys = allSettings.map(s => s.key)
    if (key !== "dashboardSettings" && allKeys.includes(key)) {
      const thisSettingDetail = allSettings.find(s => s.key === key) || {}
      const setTo = thisSettingDetail.type === "switch" ? (value === 'true') : value
      dashboardSettingDefs[key] = setTo
      logDebug('setSetting', `Set ${key} to ${String(setTo)} in dashboardSettings (type: ${typeof setTo})`)
      DataStore.settings = { ...DataStore.settings, dashboardSettings: JSON.stringify(dashboardSettings) }
      await showDashboardReact('full', false)
    } else {
      logError('setSetting', `Key '${key}' not found in dashboardSettings. Available keys: [${allKeys.join(', ')}]`)
      throw (`ERROR`)
    }
  } catch (error) {
    logError('setSetting', error.message)
  }
}

/**
 * x-callback entry point to change multiple settings in one go.
 * @param {string} `key=value` pairs separated by ;
 * @example noteplan://x-callback-url/runPlugin?pluginID=jgclark.Dashboard&command=setSetting&arg0=rescheduleNotMove&arg1=true
 * @example noteplan://x-callback-url/runPlugin?pluginID=jgclark.Dashboard&command=setSetting&arg0=ignoreTasksWithPhrase&arg1=#waiting
 */
export async function setSettings(paramsIn: string): Promise<void> {
  try {
    const dashboardSettings = (await getDashboardSettings()) || {}
    const allSettings = [...dashboardFilterDefs, ...dashboardSettingDefs].filter(k => k.label && k.key)
    const allKeys = allSettings.map(s => s.key)
    const params = paramsIn.split(';')
    logDebug('setSettings', `Given ${params.length} key=value pairs to set:`)
    const i = 0
    for (const param of params) {
      const [key, value] = param.split('=')
      logDebug('setSettings', `- ${String(i)}: setting '${key}' -> '${value}'`)
      if (key !== "dashboardSettings" && allKeys.includes(key)) {
        const thisSettingDetail = allSettings.find(s => s.key === key) || {}
        const setTo = thisSettingDetail.type === "switch" ? (value === 'true') : value
        dashboardSettingDefs[key] = setTo
        logDebug('setSettings', `  - set ${key} to ${String(setTo)} in dashboardSettings (type: ${typeof setTo})`)
      } else {
        logError('setSettings', `Key '${key}' not found in dashboardSettings. Available keys: [${allKeys.join(', ')}]`)
        throw new Error(`Key '${key}' not found in dashboardSettings`)
      }
    }
    logDebug('setSettings', `Calling DataStore.settings, then showDashboardReact()`)
    DataStore.settings = { ...DataStore.settings, dashboardSettings: JSON.stringify(dashboardSettings) }
    await showDashboardReact('full', false)
  } catch (error) {
    logError('setSettings', error.message)
  }
}

export async function makeSettingsAsCallback(): Promise<void> {
  try {
    const dashboardSettings = (await getDashboardSettings()) || {}
    const params = Object.keys(dashboardSettings).map(k => `${k}=${String(dashboardSettings[k])}`).join(';')
    // then give user the choice of whether they want a raw URL or a pretty link.
    const options = [{ label: 'raw URL', value: 'raw' }, { label: 'pretty link', value: 'link' }]
    const result = await chooseOption('Settings as URL or Link?', options, 'raw URL')
    let output = ''
    // then make the URL, using helpers to deal with encodings.
    switch (result) {
      case 'raw':
        output = createRunPluginCallbackUrl('jgclark.Dashboard', 'setSettings', params)
        break
      case 'link':
        output = createPrettyRunPluginLink('Open Dashboard with current Settings', 'jgclark.Dashboard', 'setSettings', params)
        break
      default:
        return
    }
    logDebug('makeSettingsAsCallback', `${result} output: '${output}'`)

    // now copy to Clipboard and tell the user
    const types = Clipboard.types
    logDebug('makeSettingsAsCallback', `Clipboard.types = ${String(types)}`)
    await Clipboard.setStringForType(output, 'public.url')
    await showMessage('Settings as URL or Link copied to Clipboard', 'OK', 'Dashboard', false)
  } catch (error) {
    logError('makeSettingsAsCallback', error.message)
  }
}

async function updateSectionFlagsToShowOnly(limitToSections: string): Promise<void> {
  if (!limitToSections) return
  const dashboardSettings = (await getDashboardSettings()) || {}
  // set everything to off to begin with
  const keys = Object.keys(dashboardSettings).filter((key) => key.startsWith('show'))
  allSectionDetails.forEach((section) => {
    const key = section.showSettingName
    if (key) dashboardSettings[key] = false
  })
  // also turn off the specific tag sections (e.g. "showTagSection_@home")
  keys.forEach((key) => dashboardSettings[key] = false)
  const sectionsToShow = limitToSections.split(',')
  sectionsToShow.forEach((sectionCode) => {
    const showSectionKey = allSectionDetails.find((section) => section.sectionCode === sectionCode)?.showSettingName
    if (showSectionKey) {
      dashboardSettings[showSectionKey] = true
    } else {
      if (sectionCode.startsWith("@") || sectionCode.startsWith("#")) {
        dashboardSettings[`showTagSection_${sectionCode}`] = true
      } else {
        logError(pluginJson, `updateSectionFlagsToShowOnly: sectionCode '${sectionCode}' not found in allSectionDetails`)
      }
    }
  })
  DataStore.settings = { ...DataStore.settings, dashboardSettings: JSON.stringify(dashboardSettings) }
}

/**
 * Plugin Entry Point for "Show Dashboard"
 * @author @dwertheimer
 * @param {string} callMode: 'full' (i.e. by user call) | 'trigger' (by trigger: don't steal focus) |  CSV of specific sections to load (e.g. from xcallback)
 * @param {boolean} useDemoData (default: false)
 */
export async function showDashboardReact(callMode: string = 'full', useDemoData: boolean = false): Promise<void> {
  logDebug(pluginJson, `showDashboardReact 2 starting up (mode '${callMode}')${useDemoData ? ' in DEMO MODE' : ''}`)
  try {
    const startTime = new Date()
    const limitToSections = !(callMode === 'trigger' || callMode === 'full') && callMode
    if (limitToSections) await updateSectionFlagsToShowOnly(limitToSections)

    // make sure we have the np.Shared plugin which has the core react code and some basic CSS
    await DataStore.installOrUpdatePluginsByID(['np.Shared'], false, false, true) // you must have np.Shared code in order to open up a React Window
    logDebug(pluginJson, `showDashboardReact: installOrUpdatePluginsByID ['np.Shared'] completed`)

    // log warnings if we don't have required files
    await checkForRequiredSharedFiles(pluginJson)
    logDebug(pluginJson, `showDashboardReact: checkForRequiredSharedFiles completed`)

    // get initial data to pass to the React Window
    const data = await getInitialDataForReactWindowObjectForReactView(useDemoData)
    logDebug('showDashboardReact', `lastFullRefresh = ${String(data.pluginData.lastFullRefresh)}`)

    const resourceLinksInHeader = `
      <link rel="stylesheet" href="../${pluginJson["plugin.id"]}/dashboard.css">
      <!-- <link rel="stylesheet" href="../${pluginJson["plugin.id"]}/dashboardDialog.css"> --Ю
      <link rel="stylesheet" href="../np.Shared/css.w3.css">

      <!-- Load in fontawesome assets from np.Shared (licensed for NotePlan) -->
      <link href="../np.Shared/fontawesome.css" rel="stylesheet">
      <link href="../np.Shared/regular.min.flat4NP.css" rel="stylesheet">
      <link href="../np.Shared/solid.min.flat4NP.css" rel="stylesheet">
      <link href="../np.Shared/light.min.flat4NP.css" rel="stylesheet">\n`
    const config = await getDashboardSettings() // pulls the JSON stringified dashboardSettings and parses it into object
    // clo(config, `showDashboardReact: keys:${Object.keys(config).length} config=`)
    // logDebug('showDashboardReact', `config.dashboardTheme="${config.dashboardTheme}"`)
    const logSettings = await getLogSettings()
    const windowOptions = {
      windowTitle: data.title,
      customId: WEBVIEW_WINDOW_ID,
      makeModal: false,
      savedFilename: `../../${pluginJson['plugin.id']}/dashboard-react.html` /* for saving a debug version of the html file */,
      shouldFocus: callMode !== 'trigger' /* focus window (unless called by a trigger) */,
      reuseUsersWindowRect: true,
      headerTags: `${resourceLinksInHeader}\n<meta name="startTime" content="${String(Date.now())}">`,
      generalCSSIn: generateCSSFromTheme(config.dashboardTheme), // either use dashboard-specific theme name, or get general CSS set automatically from current theme
      specificCSS: '', // set in separate CSS file referenced in header
      preBodyScript: ``,
      postBodyScript: `
        <script type="text/javascript" >
        // Set DataStore.settings so default clo etc. logging works in React
        let DataStore = { settings: {_logLevel: "${logSettings._logLevel}" } };
        </script>
      `,
    }
    logTimer('showDashboardReact', startTime, `===== Calling React =====`)
    // clo(data, `showDashboardReact data object passed`)
    logDebug(pluginJson, `showDashboardReact invoking window. showDashboardReact stopping here. It's all React from this point forward...\n`)
    // now ask np.Shared to open the React Window with the data we just gathered
    await DataStore.invokePluginCommandByName('openReactWindow', 'np.Shared', [data, windowOptions])
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Gathers key data for the React Window, including the callback function that is used for comms back to the plugin
 * @returns {PassedData} the React Data Window object
 */
export async function getInitialDataForReactWindowObjectForReactView(useDemoData: boolean = false): Promise<PassedData> {
  try {
    const startTime = new Date()
    const config: TDashboardConfig = await getDashboardSettings()
    // get whatever pluginData you want the React window to start with and include it in the object below. This all gets passed to the React window
    const pluginData = await getInitialDataForReactWindow(config, useDemoData)
    // logDebug('getInitialDataForReactWindowObjectForReactView', `lastFullRefresh = ${String(pluginData.lastFullRefresh)}`)

    const ENV_MODE = 'development' /* 'development' helps during development. set to 'production' when ready to release */
    const dataToPass: PassedData = {
      pluginData,
      title: useDemoData ? 'Dashboard (Demo Data)' : 'Dashboard',
      debug: false, // ENV_MODE === 'development' ? true : false,
      ENV_MODE,
      returnPluginCommand: { id: pluginJson['plugin.id'], command: 'onMessageFromHTMLView' },
      componentPath: `../${pluginJson["plugin.id"]}/react.c.WebView.bundle.${ENV_MODE === 'development' ? 'dev' : 'min'}.js`,
      startTime,
      windowID: WEBVIEW_WINDOW_ID,
    }
    return dataToPass
  } catch (error) {
    logError(pluginJson, error.message)
    // $FlowFixMe[prop-missing]
    return {}
  }
}

/**
 * Gather data you want passed to the React Window (e.g. what you you will use to display)
 * You will likely use this function to pull together your starting window data
 * Must return an object, with any number of properties, however you cannot use the following reserved
 * properties: pluginData, title, debug, ENV_MODE, returnPluginCommand, componentPath, passThroughVars, startTime
 * @returns {[string]: mixed} - the data that your React Window will start with
 */
export async function getInitialDataForReactWindow(config: TDashboardConfig, useDemoData: boolean = false): Promise<TPluginData> {
  // logDebug('getInitialDataForReactWindow', `lastFullRefresh = ${String(new Date().toLocaleString())}`)

  logDebug('getInitialDataForReactWindow', `getInitialDataForReactWindow ${useDemoData ? 'with DEMO DATA!' : ''} config.FFlag_ForceInitialLoadForBrowserDebugging=${String(config.FFlag_ForceInitialLoadForBrowserDebugging)}`)

  // Important Note: If we need to force load everything, it's easy.
  // But if we don't then 2 things are needed:
  // - the getSomeSectionsData() for just the Today section(s)
  // - then once the HTML Window is available, Dialog.jsx realises that <= 2 sections, and kicks off incrementallyRefreshSections to generate the others

  const sections = config.FFlag_ForceInitialLoadForBrowserDebugging === true
    ? await getAllSectionsData(useDemoData, true, true)
    : await getSomeSectionsData([allSectionDetails[0].sectionCode], useDemoData, true)

  const NPSettings = getNotePlanSettings()

  const pluginData: TPluginData =
  {
    sections: sections,
    lastFullRefresh: new Date(),
    dashboardSettings: JSON.stringify(config),
    notePlanSettings: NPSettings,
    logSettings: getLogSettings(),
    demoMode: useDemoData,
    platform: NotePlan.environment.platform, // used in dialog positioning
    themeName: config.dashboardTheme ? config.dashboardTheme : Editor.currentTheme?.name || '<could not get theme>',
  }

  // Calculate all done task counts (if the appropriate setting is on)
  if (NPSettings.doneDatesAvailable) {
    const totalDoneCounts = rollUpDoneCounts([getTotalDoneCounts(sections)], buildListOfDoneTasksToday())
    pluginData.totalDoneCounts = totalDoneCounts
  }

  return pluginData
}

/**
 * TODO: think about doing a function to remove all duplicates from sections *on completion* not on display
 */

/**
 * Update the data in the React Window (and cause it to re-draw as necessary with the new data)
 * This is likely most relevant when a trigger has been sent from a NotePlan window, but could be used anytime a plugin wants to update the data in the React Window
 * This is exactly the same as onMessageFromHTMLView, but named updateReactWindowData to clarify that the plugin is updating the data in the React Window
 * rather than a user interaction having triggered it (the result is the same)
 * See discussion at https://discord.com/channels/@me/863719873175093259/1229524619615010856
 * @param {string} actionType - the reducer-type action to be dispatched -- see onMessageFromHTMLView above
 * @param {any} data - any data that the router (specified in onMessageFromHTMLView) needs -- may be nothing
 * @returns {Promise<any>} - does not return anything important
 */
export async function updateReactWindowData(actionType: string, data: any = null): Promise<any> {
  if (!getWindowFromId(WEBVIEW_WINDOW_ID)) {
    logError(pluginJson, `updateReactWindowData('${actionType}'): Window with ID ${WEBVIEW_WINDOW_ID} not found. Could not update data.`)
    return
  }
  await onMessageFromHTMLView(actionType, data)
}

/**
 * Router function that receives requests from the React Window and routes them to the appropriate function
 * (e.g. handleSubmitButtonClick example below)
 * Here's where you will process any other commands+data that comes back from the React Window
 * @author @dwertheimer
 */
export async function onMessageFromHTMLView(actionType: string, data: any): Promise<any> {
  try {
    let _newData = null
    logDebug(pluginJson, `NP Plugin return path (onMessageFromHTMLView) received actionType="${actionType}" (typeof=${typeof actionType})  (typeof data=${typeof data})`)
    // clo(data, `Plugin onMessageFromHTMLView data=`)
    const reactWindowData = await getGlobalSharedData(WEBVIEW_WINDOW_ID) // get the current data from the React Window
    if (data.passThroughVars) reactWindowData.passThroughVars = { ...reactWindowData.passThroughVars, ...data.passThroughVars }
    switch (actionType) {
      case 'SHOW_BANNER':
        sendToHTMLWindow(WEBVIEW_WINDOW_ID, 'SHOW_BANNER', data)
        break
      // WEBVIEW_WINDOW_ID
      // Note: SO THAT JGCLARK DOESN'T HAVE TO RE-INVENT THE WHEEL HERE, WE WILL JUST CALL THE PRE-EXISTING FUNCTION bridgeDashboardItem
      // every time
      default:
        _newData = (await bridgeClickDashboardItem(data)) || reactWindowData // the processing function can update the reactWindowData object and return it
        // await sendBannerMessage(WEBVIEW_WINDOW_ID, `Plugin received an unknown actionType: "${actionType}" command with data:\n${JSON.stringify(data)}`)
        break
    }

    return {} // this return value is ignored but needs to exist or we get an error
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Update the sections data in the React Window data object
 * @returns {Promise<any>} - returns the full reactWindowData
 */
async function refreshDashboardData(prevData?: any): any {
  const reactWindowData = prevData ?? (await getGlobalSharedData(WEBVIEW_WINDOW_ID)) // get the current data from the React Window
  const { demoMode } = reactWindowData
  const sections = await getAllSectionsData(demoMode, false, true)
  logDebug(`refreshDashboardData`, `after get all sections sections[0]=${sections[0].sectionItems[0].para?.content ?? '<empty>'}`)
  reactWindowData.pluginData.sections = sections
  logDebug(`refreshDashboardData`, `after get all sections reactWindowData[0]=${reactWindowData.pluginData.sections[0].sectionItems[0].para?.content ?? '<empty>'}`)
  clo(reactWindowData.pluginData.sections, 'refreshDashboardData: reactWindowData.pluginData.sections=')
  return reactWindowData
}

/**
 * An example handler function that is called when someone clicks a button in the React Window
 * When someone clicks a "Submit" button in the React Window, it calls the router (onMessageFromHTMLView)
 * which sees the actionType === "onSubmitClick" so it routes to this function for processing
 * @param {any} data - the data sent from the React Window for the action 'onSubmitClick'
 * @param {any} reactWindowData - the current data in the React Window
 * @returns {any} - the updated data to send back to the React Window
 */
async function handleSubmitButtonClick(data: any, reactWindowData: PassedData): Promise<PassedData> {
  const { index: clickedIndex } = data //in our example, the button click just sends the index of the row clicked
  await sendBannerMessage(
    WEBVIEW_WINDOW_ID,
    `Plugin received an actionType: "onSubmitClick" command with data:<br/>${JSON.stringify(
      data,
    )}.<br/>Plugin then fired this message over the bridge to the React window and changed the data in the React window.`,
  )
  clo(reactWindowData, `handleSubmitButtonClick: reactWindowData BEFORE update`)
  // change the data in the React window for the row that was clicked (just an example)
  // find the right row, even though rows could have been scrambled by the user inside the React Window
  const index = reactWindowData.pluginData.tableRows.findIndex((row) => row.id === clickedIndex)
  reactWindowData.pluginData.tableRows[index].textValue = `Item ${clickedIndex} was updated by the plugin (see changed data in the debug section below)`
  return reactWindowData //updated data to send back to React Window
}
