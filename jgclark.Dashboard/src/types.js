// @flow
//-----------------------------------------------------------------------------
// Types for Dashboard code
// Last updated 2024-07-09 for v2.0.1 by @jgclark
//-----------------------------------------------------------------------------
// Types for Settings

export type TDashboardLoggingConfig = {
  _logLevel: string,
  _logTimer: boolean,
}

export type TNotePlanConfig = {
  defaultFileExtension: string,
  doneDatesAvailable: boolean,
  timeblockMustContainString: string,
}

export type TDashboardConfig = {
  separateSectionForReferencedNotes: boolean,
  filterPriorityItems: boolean, // also kept in a DataStore.preference key
  dashboardTheme: string,
  hideDuplicates: boolean,
  ignoreTasksWithPhrase: string,
  ignoreChecklistItems: boolean,
  ignoreFolders: Array<string>,
  includeFolderName: boolean,
  includeTaskContext: boolean,
  rescheduleNotMove: boolean,
  newTaskSectionHeading: string,
  newTaskSectionHeadingLevel: number,
  autoAddTrigger: boolean,
  excludeChecklistsWithTimeblocks: boolean,
  excludeTasksWithTimeblocks: boolean,
  showYesterdaySection: boolean,
  showTomorrowSection: boolean,
  showWeekSection: boolean,
  showMonthSection: boolean,
  showQuarterSection: boolean,
  showOverdueSection: boolean,
  showProjectSection: boolean,
  maxItemsToShowInSection: number,
  overdueSortOrder: string,
  tagsToShow: string,
  ignoreTagMentionsWithPhrase: string,
  updateTagMentionsOnTrigger: boolean,
  useTodayDate: boolean,
  // _logLevel: string,
  // _logTimer: boolean,
  FFlag_ForceInitialLoadForBrowserDebugging: boolean, // to 
  FFlag_LimitOverdues: boolean,
  FFlag_HardRefreshButton: boolean,
  moveSubItems: boolean,
  interactiveProcessingHighlightTask: boolean,
  // sharedSettings: any, // Note: no longer needed after settings refactor
}

//-----------------------------------------------------------------------------
// Other types

export type TSectionCode = 'DT' | 'DY' | 'DO' | 'W' | 'M' | 'Q' | 'OVERDUE' | 'TAG' | 'PROJ' // | 'COUNT' // where DT = today, DY = yesterday, TAG = Tag, PROJ = Projects section

export type TSectionDetails = { sectionCode: TSectionCode, sectionName: string, showSettingName: string }

// details for a section
export type TSection = {
  ID: string,
  name: string, // display name 'Today', 'This Week', 'This Month' ... 'Projects', 'Done'
  showSettingName: string, // setting for whether to hide this section
  sectionCode: TSectionCode,
  description: string,
  sectionItems: Array<TSectionItem>,
  FAIconClass?: string, // CSS class to show FA Icons
  sectionTitleClass: string, // CSS class
  sectionFilename?: string, // filename for relevant calendar (or not given if a non-calendar section)
  actionButtons?: Array<TActionButton>,
  generatedDate?: Date, // note different from lastFullRefresh on whole project
  totalCount?: number, // for when not all possible items are passed in pluginData
  doneCounts?: TDoneCount, // number of tasks and checklists completed today etc.
}

export type TItemType = 'open' | 'checklist' | 'congrats' | 'project' | 'filterIndicator'

// an item within a section, with optional TParagraphForDashboard
export type TSectionItem = {
  ID: string,
  // sectionCode: TSectionCode, // might want this in future
  itemType: TItemType,
  para?: TParagraphForDashboard /* where it is a paragraph-type item (not 'project') */,
  project?: TProjectForDashboard,
  updated?: boolean, // used to keep deletes from confusing the dialog which is waiting for updates to the same line
  // updated will be set by the copyUpdatedSectionItemData function when content is modified
}

// reduced paragraph definition
export type TParagraphForDashboard = {
  filename: string,
  noteType: NoteType /* Notes | Calendar */,
  title?: string, // not present for Calendar notes
  type: ParagraphType, // paragraph type
  prefix?: string,
  content: string,
  rawContent: string,
  priority: number,
  blockId?: string,
  timeStr?: string, // = timeblock. TODO: is this still used?
  startTime?: string, // this is still definitely used to style time blocks
  endTime?: string,
  changedDate?: Date, // required for sorting items in display
  hasChild?: boolean, // whether it has child item(s)
}

// a project item within a section
export type TProjectForDashboard = {
  filename: string /* of the note the task originally comes from (not the Calendar it might be referenced to) */,
  title: string /* of the note the task originally comes from (not the Calendar it might be referenced to) */,
  reviewInterval: string, /* from the Project instance */
  percentComplete: number, /* from the Project instance */
  lastProgressComment: string, /* from the Project instance */
}

// details for a UI button
export type TActionButton = {
  display: string,
  actionPluginID: string,
  actionName: TActionType,
  actionParam: string /* NB: all have to be passed as a string for simplicity */,
  postActionRefresh?: Array<TSectionCode>,
  tooltip: string,
}

export type TActionType =
  | 'addChecklist'
  | 'addProgress'
  | 'addTask'
  | 'cancelProject'
  | 'cancelTask'
  | 'completeProject'
  | 'completeTask'
  | 'completeTaskThen'
  | 'completeChecklist'
  | 'cancelChecklist'
  | 'cyclePriorityStateUp'
  | 'cyclePriorityStateDown'
  | 'deleteItem'
  | 'moveAllTodayToTomorrow'
  | 'moveAllYesterdayToToday'
  | 'moveFromCalToCal'
  | 'moveToNote'
  | 'onClickDashboardItem'
  | 'reactSettingsChanged'
  | 'refresh'
  | 'refreshSomeSections'
  | 'setNextReviewDate'
  | 'reviewFinished'
  | 'showNoteInEditorFromFilename'
  | 'showNoteInEditorFromTitle'
  | 'showLineInEditorFromFilename'
  | 'showLineInEditorFromTitle'
  | 'scheduleAllOverdueToday'
  | 'setNewReviewInterval'
  // | 'setSpecificDate'
  | 'dashboardSettingsChanged'
  | 'startReviews'
  | '(not yet set)'
  | 'toggleType'
  | 'togglePauseProject'
  | 'unknown'
  | 'unscheduleItem'
  | 'updateItemContent'
  | 'updateTaskDate'
  | 'windowWasResized'
  | 'incrementallyRefreshSections'
  | 'windowReload'
  | 'windowResized'

export type TControlString =
  | 't'
  | '+1d'
  | '+1b'
  | '+2d'
  | '+0w'
  | '+1w'
  | '+2w'
  | '+0m'
  | '+0q'
  | 'canceltask'
  | 'movetonote'
  | 'priup'
  | 'pridown'
  | 'tog'
  | 'ct' // TODO(@dbw): what's this? Please disambiguate with 'canceltask' above, which could shortened to 'ct'
  | 'unsched'
  | 'finish'
  | 'nr+1w'
  | 'nr+2w'
  | 'nr+1m'
  | 'nr+1q'

// for passing messages from React Window to plugin
export type MessageDataObject = {
  item?: TSectionItem, // optional because REFRESH doesn't need anything else
  // itemID?: string, // we think this isn't needed
  actionType: TActionType, // main verb (was .type)
  controlStr?: TControlString, // further detail on actionType
  updatedContent?: string, // where we have made an update in React window
  newSettings?: string, /* either reactSettings or dashboardSettingsdepending on actionType */
  modifierKey?: any, /* used when modifier key is pressed with an action */
  sectionCodes?: Array<TSectionCode>, // needed for processActionOnReturn to be able to refresh some but not all sections
  toFilename?: string,
  newDimensions?: { width: number, height: number },
  settings?: TAnyObject,
  filename?: string, /* only used when actionType = 'showNoteInEditorFromFilename', otherwise filename comes from the item */
  logMessage?: string,
}

/**
 * Each called function should use this standard return object
 */

export type TActionOnReturn = 'UPDATE_LINE_IN_JSON' | 'REMOVE_LINE_FROM_JSON' | 'REFRESH_SECTION_IN_JSON' | 'REFRESH_ALL_SECTIONS' | 'REFRESH_ALL_CALENDAR_SECTIONS' | 'START_DELAYED_REFRESH_TIMER'

export type TBridgeClickHandlerResult = {
  success: boolean,
  updatedParagraph?: TParagraph,
  actionsOnSuccess?: Array<TActionOnReturn>, // actions to perform after return
  sectionCodes?: Array<TSectionCode>, // needed for processActionOnReturn to be able to refresh some but not all sections
  errorMsg?: string,
}

export type TClickPosition = {
  clientX: number,
  clientY: number,
}

export type TDialogData = {
  isOpen: boolean,
  isTask?: boolean,
  clickPosition?: TClickPosition,
  details?: MessageDataObject
}

export type TReactSettings = {
  lastChange?: string /* settings will be sent to plugin for saving unless lastChange starts with underscore */,
  dialogData?: TDialogData,
  interactiveProcessing?: TInteractiveProcessing,
}

export type TPluginData = {
  dashboardSettings: any, /* plugin settings */
  logSettings: any, /* logging settings from plugin preferences */
  notePlanSettings: any, /* for copies of some app settings */
  refreshing?: Array<TSectionCode> | boolean, /* true if all, or array of sectionCodes if some */
  sections: Array<TSection>,
  lastFullRefresh: Date, /* localized date string new Date().toLocaleString() */
  themeName: string, /* the theme name used when generating the dashboard */
  platform: string, /* the platform used when generating the dashboard */
  demoMode: boolean, /* use fake content for demo purposes */
  totalDoneCounts?: TDoneCount,
  startDelayedRefreshTimer?: boolean, /* start the delayed refresh timer hack set in post processing commands*/
}

// export type TDashboardConfig = {
//   //TODO: jgclark: add the specific shared settings
//   [key: string]: any,
// }

export type TDropdownItemType = 'switch' | 'input' | 'combo' | 'text' | 'separator' | 'heading' | 'header'

export type TDropdownItem = {
  type: TDropdownItemType,
  label?: string,
  key?: string,
  checked?: boolean,
  value?: string,
  options?: Array<string>,
  textType?: 'title' | 'description' | 'separator',
  tooltip?: string, // TODO(dbw): is this unused, now you have changed to use descriptions in the settings dialog?
  description?: string,
}

export type TPluginCommandSimplified = {
  commandName: string,
  pluginID: string,
  commandArgs: $ReadOnlyArray<mixed>,
}

export type TInteractiveProcessing = {
  sectionName: string,
  currentIPIndex: number,
  totalTasks: number,
  clickPosition: TClickPosition,
  startingUp?: boolean,
} | false

export type TDoneCount = {
  completedTasks: number,
  // completedChecklists: number,
  lastUpdated: Date
}

export type TDoneTodayNotes = {
  filename: string,
  counts: TDoneCount,
}
