# What's changed in 🎛 Dashboard plugin?
For more details see the [plugin's documentation](https://github.com/NotePlan/plugins/tree/main/jgclark.Dashboard/).

## [2.0.1] WIP @jgclark
### Added
- FIXME: new x-callback 'setSetting' to change a single Dashboard setting. TODO: See README for details.
- FIXME: new x-callback 'setSettings' to change multiple Dashboard settings in one call. TODO: See README for details.
- new **/Make Callback from Current Settings** command that logs the current setting as a URL or a markdown link. FIXME: not copying to clipboard. FIXME: the output doesn't match what appears to be set in my UI.

### Changes
- made the Filters dropdown menu a two-column display (except on narrow screens)
- (under-the-hood) add quite a lot of logTimer() calls, and added a new setting for it to both old and new setting systems
- removed most settings from old setting system
- removed "edit settings (for iOS)" command, as not needed
- improved spacing and ordering of heading, and made tapping heading elements easier on iOS
- other UI tweaks
- complete refactoring of settings data structures under the hood (TODO: not quite complete)

### Fixed
- fix task completion timestamps using GMT not local time (thanks, @mjd9ball).

## What's improved in v2.0?
### New
- The different sections are now generated or refreshed progressively, so the first sections appear more quickly. When refreshing the display, the dashboard is smarter and will only update the necessary sections, displaying indicators next to the section items as it does so.
- Auto-refresh: by default the Dashboard will now automatically pick up new/changed tasks in NotePlan after it has been idle for 15 minutes (configurable). This means that you probably no longer need to add a trigger to the notes with tasks you're completing/changing frequently.
- New Processing button that opens up the Task Edit dialog showing the first item in the section. When you click on an action button it then updates to show you the next item, and so on. In this mode there's an extra 'forward' button that lets you leave that item where it is.
- Can now show multiple tags/mentions, by specifying them in the setting separated by commas
- New Filter dropdown that allows you to quickly toggle on or off all the main display settings, including which sections to show -- moved from the Preferences Pane
- New Settings button which opens a window that has the rest of the more detailed settings for the plugin -- moved from the Preferences Pane
- In the task dialog box, added a couple of new controls, including the 🗓️ control which opens up a date picker to allow picking any date to move a task to
- In the project dialog box, added:
  - a new 🗓️ control which opens up a date picker to allow picking any date to schedule the next project to
  - new "Complete Project", "Cancel Project", "Pause Project" buttons, that each mimic the same command from the Project & Reviews plugin
  - now shows the latest 'Progress' comment for a project, and a button to add a new comment.
- When the NotePlan Theme is changed (manually or automatically), the Dashboard window will automatically pick this up on the next refresh.
- ^-click (ctrl-click) on an item's status icon now deletes the item entirely (after a check with the user).
- Added an x-callback to allow specifying which sections you want to see. For details see README.
- Note: some of the buttons are hidden when running on iOS or iPadOS because of limitations in the environment the Dashboard runs in. We are hopeful these will be removed in time.

### Changed
- Should now work better on iPhones and iPads
- Removed the separate limit on number of Project items shown; it will now use the main limit setting (if set).
- The 'Update Overdue section when triggered?' setting has been removed, as it is no longer needed with the smarter data generation
- Removed the keyboard shortcuts to toggle sections, as there is the new Filter quick menu.
- The count of tasks done today now includes those completed in project notes, not just from the calendar sections shown. Note: this requires having the NotePlan setting 'Todo > Append Completion Date' setting turned on, as otherwise we can't tell when a task is finished. (As @done(...) dates don't get appended to completed checklists, it's not possible to count completed checklists.) To save space, this is not shown on iOS devices.

### Fixed
- a task in today's note "* a task >today" doesn't show up on today's dashboard
- tasks in future notes showing up in #tag section
- synced copies dated for today were duplicated
- "Dashboard: update plugin settings" command not working (reported by @todd9252 on v1.2)
- other bug fixes
<!--
## [2.0.0.b17] 2024-07-02
- dbw: fix to have window darkened under dialog boxes
- jgc/dbw: fix to main status icon positioning
- jgc: polishing the button sizing and layout in dialogs
- jgc: fix to positioning of project dialog now that it's grown
- jgc: fixed edge case in Thingies theme that rendered buttons with the wrong font
- jgc: tweaked icon layout slightly (but needs @dbw help to deal with tooltip component)
- jgc: made UI text singular not plural when needed
- jgc: updates to demo data before taking screenshots

## [2.0.0.b16] 2024-06-29
- jgc: fix to moving tasks with no children between dates (oops)
- jgc: extended @done tasks counts to cover all project notes as well.

## [2.0.0.b15] 2024-06-28
- jgc: fix to child tasks not getting moved with their parent
- jgc: basic counts of @done tasks re-introduced, covering just tasks in calendar notes. Note: requires having the NotePlan setting 'Todo > Append Completion Date' setting turned on, as otherwise we can't tell when a task is finished. (As @done(...) dates don't get appended to completed checklists, its not possible to count completed checklists.) To save space, this is not shown on iOS devices.
- jgc: remove '(React)' from window title before doing documentation + video

## [2.0.0.b14] 2024-06-25
- jgc: added latest progress text to the Project dialog box, plus a new button to add new progress text
- jgc: removed separate limit on number of project items to be shown: it will now use the main limit setting (if set)
- jgc: also hide the "Project" row buttons in the Project Dialog on mobile
- jgc: improve 'narrow' layout of section info
- jgc: fix to useSectionSortAndFilter not using maxTasksToShowInSection setting
- jgc: change to project handling: when writing completed and cancelled project summaries to the yearly note, it now puts them as simple list items, not tasks, to avoid a conflict with a Tidy Plugin command.
- jgc: fix colour of CalendarPicker and Filter applied icons
- dbw: Override recent changes to .PCButton which affect the Settings Dialog
- dbw: fixes to Settings Dialog CSS on iOS
- dbw: remove the automatic refresh on all filter dropdown settings

## [2.0.0.b13] 2024-06-23
- dbw: fix the infinite loop when dashboard theme is set (thanks, @georgec)

## [2.0.0.b12] 2024-06-22
- dbw: hide the "move to" button in the Task Dialog on mobile

## [2.0.0.b11] 2024-06-22
- dbw: work-around iPad/iPhone limitations in plugin-React communications on mobile
- dbw: hide CommandBar buttons which won't work on mobile
- dbw: allow the overdue->today and other -> today buttons
- dbw: add CSS to move settings buttons away from NP sheet X close button
- dbw: rewrite timeAgo text & hard refresh text to make it more efficient space-wise for mobile

## [2.0.0.b10] 2024-06-22
- dbw: add x-callback support
- jgc: polish look and positioning of buttons
- jgc: fix to 'new review interval' date handling
- jgc: avoid 'You are running this on an async thread' warnings.
- jgc: fix wrong background colour on project completion rings
- jgc: fix "Dashboard: update plugin settings" command not working
- jgc: fix clicking project dialog title not opening note
- jgc: fix to annoying logging problem
- jgc: fix to setting newTaskSectionHeadingLevel not being used
- jgc: fix to edge case with Review plugin's getNextNoteToReview()
- jgc: fix "Dashboard: update plugin settings" command not working (reported by @todd9252 on v1.2)
- dbw: hide IP button if there is only one item
- dbw: fix bug in hideDuplicates and overdues
- dbw: fix priority marker hiding
- dbw: fix incorrectly labeled modifier tooltips on statusIcon

## [2.0.0.b9] 2024-06-19
- jgc: added Project Complete, Cancel and Pause buttons to the edit dialog
- jgc: added 'New Review Interval' button to the edit dialog
- jgc: added little project completion indicator at the start of a Project line item
- jgc: added current Project progress line (if available) to the Project line item
- jgc: updated theming to use NP's sidebar colouring for the 'sidebar' elements of the Dashboard window
- dbw: add check for Dashboard Theme setting change
- dbw: remove blue outline on focus
- dbw: move logLevel to settings (you don't need to set it in NP plugin pane settings)

## [2.0.0.b8] 2024-06-14
- jgc: improved some section refreshes after adding items, toggling items
- jgc: add log warnings in Theme generation code if missing ["flagged-1", "flagged-2", "flagged-3", "working-on"] keys (thx @dbw)
- jgc: fix to changing dates on tasks in project notes (thx @GeorgeC)
- jgc: fix for 'getRelativeDate' errors in logs
- jgc: fixed regression on Refreshing spinner

## [2.0.0.b7] 2024-06-13
- jgc: fix to clicking edit/dialog button for Project items (thx @GeorgeC)
- jgc: added missing click handler for Project item titles (thx @GeorgeC)

## [2.0.0.b6] (and other dot releases prior...lots of iterative testing required) 
- Added settings automigration from original Dashboard

## [2.0.0.b2] 2024-06-11
- jgc: following @aaronpoweruser suggestion that an item with ">today" should have that removed when completing it, to align with how NP reference section works.
- jgc: fix bug that today items with ">today" would be shown truncated
- jgc: added tests to more scheduled date handling functions
- dbw: fix for notes that don't exist

## [2.0.0.b1] 2024-06-11
- dbw: add first-time settings migration saving
- dbw: fix bug where StatusIcon tooltips were visible when dialog was open

## [2.0.0.a34] 2024-06-06
- jgc: added marker after an item to show if it has child/children items
- dbw: added filter setting (includeScheduledDates) to hide >scheduled dates which were a lot of clutter when you use scheduling mode
- dbw: added filter setting (hidePriorityMarkers) to hide priority markers (assumes you can see priorities in color)
- dbw: fixed bug/discrepancy where >> was sometimes priority 5 and sometimes priority 4 (always 4 now)
- dbw: add first-time settings migration saving
- dbw: fix bug where StatusIcon tooltips were visible when dialog was open
- dbw: add ability to open note (e.g. tomorrow or week) by clicking the section header

## [2.0.0.a33] 2024-06-04
- jgc: (now that NP r1208 is out) changed alt-click to ctrl-click, as that's what @dbw was after originally
- jgc: moved 5 true/false settings from dashboardSettings to dashboardFilters
- jgc: fixed move date buttons so +1d, +1w etc. are relative to today, not the date of the note they are currently in
- dbw: improve modifier keys filtering functions
- dbw: add kbd modifers to the open note links so they open in a new window or splitview
- dbw: added normal tooltips to the filter settings that have a "description" set in the field definition
- dbw: fixed bug where rollover on file link could still be seen when dialog was up (mouse position bleeding through) -- there is yet another one to solve with the StatusIcon
- dbw: fixed bug where #tagged items in a regular note that were scheduled for the future would show up. Now they don't

## [2.0.0.a32] 2024-06-02
- fix reschedule date using dialog
- removed 'updateOverdueOnTrigger' setting, as I think it is not needed now we have smarter data generation strategies
- alt-click on an item's status icon now deletes the item entirely (after a check with the user).
- improved Plugin description
- dbw: fixed refresh button scroll issue
- dbw: Changed autorefresh settings to a single field 
- dbw: Created a trap for computer sleep and refresh intervals piling up

## [2.0.0.a31] @dbw 2024-06-01
- fix sort on the Today sections so that the one with the buttons is on top
- remove FFlag on autoRefresh, and add setting for autoRefresh (but turned it off when you are in DEV mode)
- refine/tighten up refreshTimer
- call refresh timer [5s] after a dialog button was pressed - just to make sure there are no unrefreshed changes
- make it possible to call a refresh timer after a CommandButton press (though for the moment this is turned off because many of these buttons could take user input and therefore a long time to happen)
- therefore created a way to call refresh timer [5s] from the plugin side after the command finishes (see Architecture notes)
- added this action START_DELAYED_REFRESH_TIMER to all the moveClickHandlers functions (I'm sure there are others that need it that we will figure out over time)
- removed duplicates of synced lines that may be in different notes so they were sneaking through
- added new function to dateTime called filenameIsInFuture which functions like your includesScheduledFutureDate but to be used for tasks just sitting in future notes
- used it to fix the bug where #tag sections were showing tasks in future notes
- fix IP dialog close bug (IP not stopping)

## [2.0.0.a30] 2024-05-31
- added 'move' (rather than 'reschedule') functionality back in
- finished wiring up the date picker in TaskDialog and ProjectDialog to do 'move' or 'reschedule' accordingly
- stopped IP button from being shown for Projects section
- updated display of referenced section names: now start with '>'
- updated settings CSS to use values from the theme, and to make it look more like the main NP preferences dialog
- to help browser debugging, updated getInitialDataForReactWindow() to change the way initial load works, and document what's going on. (Also rename FFlag_ForceInitialLoad to FFlag_ForceInitialLoadForBrowserDebugging.)
- changed section.ID from number to string throughout (to reduce flow errors)
- dbw: fix mixHexColors per jgclark recommendation
- dbw: add >> to priority calculation in sorting.js so it's priority 5

## [2.0.0.a29] @dbw 2024-05-30
- Fixed bug in doUpdateTaskDate (for +1d etc) that was causing it to not update react JSON (doUpdateTaskDate was not passing updatedParagraph)
- Realized this would cause another bug that Reviews would not be passing updatedParagraph either. So fixed this. Reviews are now removed when you click "Review Complete"
- Added a Projects section refresh after handling a review - do you will always have 6 (unless you don't have)
- Put in note re: setSpecificDate -- jgclark needs to update the doSetSpecificDate() function to do the right thing with reviews
- Fixed some bugs with duplicates with multiple sections with the same sectionCode

## [2.0.0.a28] @jgc, @dbw 2024-05-28
- now forces a window reload on theme change
- fix some of the header layout (Components and CSS) so that buttons can be added removed with relative impunity
- fixed positioning of dialogs which could get hidden under the floating header
- 'move to note' dialog button now works again (though handler needs extending slightly)
- updated demoData to suit latest data types
- removed 3 superseded code files
- removed 2 settings from getSettings that are now handled elsewhere
- removed about 15 plugin commands from plugin.json, as we have moved the command triggering to internal calls
- dbw: Added hard refresh button. Not doing any styling for now, so it pushes over the filters
- dbw: fix bugs where arrow dates were not showing up in dashboard. there were two bugs, and extended a helper (includesScheduledFutureDate) to look forward from a date passed to it (not always today).
- dbw: fix refresh after move to today (turned it into an incremental refresh of all sections, which seems to work)
- dbw: interactiveProcessing: add indicator of where you are in the list
- dbw: remove rescheduleOrMove which was similarly named but confusing/not used
- dbw: fixed feature flags not saving
- dbw: fixed settings panel values sometimes not saving (still some clean-up to do)
- dbw: improved sharedSettings initialization (made it happen earlier)
- dbw: fixed errant reloads at launch

## [2.0.0.a27] 2024-05-27
- restored the 'show referenced data in separate section' again when generating data
- window dimensions are saved again between refreshes
- note to DBW: I have moved some of the 'force' logic to getAllSectionsData, which is I think where it needs to be as that's used on initialLoad. I have left it in getSomeSectionsData as well, though I think it could be removed.
- dbw: added windowReload clickHandler to force full window reload when the refresh button is clicked and you have loggingLevel set to "DEV"
- dbw: moved settings to dialog to mirror NP per @jgclark suggestion
- dbw: remove shared/reactSettings logging on init
- dbw: turn on checklist filtering in ItemGrid to make filtering immediate while refresh happens in background
- dbw: fix bug in demo dashboard refresh forgetting demoMode
- dbw: fix a couple of type paste errors in demo data
- dbw: added fflag limit overdues to last 2w for @jgclark

## [2.0.0.a26] 2024-05-24
- fixed only having a partial refresh following bulk moves: cause was the reverse of the usual stale-data problem, when reading from Editor
- fixing dark mode CSS for new Settings dropdown
- set more natural widths for the various dropdown menus
- WIP moved "Show referenced items in separate section?" from setting to toggles dropdown -- but it's not yet making an effect. Note: I don't understand the settings system completely now, so don't know what's wrong.

- dbw: Started Architecture/How Stuff Works Notes
- dbw: fixed z-index bugs which caused floating issues
- dbw: WIP interactive processing loop for all sections (fflag)

## [2.0.0.a25] @dwertheimer
- added Feature Flags
- initial Settings dropdown for testing
- initial Autorefresh for testing
- Moved some hooks around
- Created resize watcher custom hook
- Fixed bug: tags not showing up after new settings added
- Added multiple tags, separated by commas
- Add force full initial load feature flag so browser debugging can have all sections
- bug fix: dialog title bar click
- clean up ItemGrid -> custom hook useInteractiveProcessing
- overdue processing: WIP

## [2.0.0.a24] @jgc
- when a trigger notices a change to one of the relevant calendar notes (typically the 'Today' note), it only updates the relevant section
- Fix only partial window update after 'move' buttons clicked. **Note to @DBW**: the issue was processActionOnReturn() caring too much about data.item.para.filename. It now doesn't. Is that likely to be a problem?
- fixed scheduleAllYesterdayOpenToToday() and scheduleAllTodayOpenToTomorrow() not moving referenced tasks
- Get scheduleAllOverdue... working with TParas again. **@DBW: please test**
- moved constant definitions from types.js to new constants.js file
- dbw: Fix switches not working
- dbw: Set interval to fire immediately when lastFullRefresh changes
- dbw: change/fix positioning dialogs to use @jgclark's algorithm
- dbw: Insert <IdleTimer> for testing


## [2.0.0.a23] @dbw
- fixed bug in overdues not respecting ignoreFolders on refresh
- fixed top-alignment spacing for calendar picker
- changed project dialog to have one month calendar picker so that it fits in the smaller dialog
- fixed the #home not showing up if it was off on load
- added incrementallyRefreshSections to load all sections (other than Today) on first load
- Fix date handling to match @jgclark recent changes
- Add CHANGE_THEME code to change the styles when your Editor theme changes. But for HTML reasons, it doesn't show. Hoping @jgclark can figure out why.
- Removed sharedSettings writing on initial load
- Fix header disappeared
- Fix timeAgo - @jgclark I had to turn the frequency of the check back up. It's no big deal at 1s check.

## [2.0.0.a22] @jgc
- completed layout in Project dialog (apart from CalendarPicker)
- tweaked display in Task dialog (apart from CalendarPicker)
- fixed time ago in Header

## [2.0.0.a21] @dbw
- got click actions to work from the new StatusIcon on the ItemDialog
- doCancelTask & doCancelChecklist were not deleting the line properly because they were not passing {updatedParagraph} so it could be deleted. Fixed this.
- Fixed ❗️ERROR❗️ processActionOnReturn :: undefined
- Got Projects dialog to display (fields are not set and it's not centered in the window...you may need to scroll up/down to find it)

## [2.0.0.a20] @jgc
- Added circle/square back into task dialog box display -- but actions from it not checked
- Updated project dialog box to match the task dialog -- but have failed to get it to run

## [2.0.0.a19] @dbw
- Fix tooltips that said add new task for checklists
- Remove several JS files
- Remove bugs caused by sending "updatedPara" rather than "updatedParagraph"
- Verify and cross off a lot of todos

## [2.0.0.a18] @jgc/@dbw
- got most of "All Today -> Tomorrow" operation working
- got most of "All Yesterday -> Today" operation working
- got most of "All Overdue -> Today" operation working
- added refresh spinners for the 3 new "move" buttons
- fixed background colour of dropdown menu (wrong in dark mode)
- fixed Overdue section description
- make the ignoreChecklist setting work properly
- all the UI switches are saved and can potentially refresh the interface.

## [2.0.0.a17] @jgc
- added 'onEditorWillSave' trigger
- stopped dashboard refresh getting focus when started by a trigger
- hooked up add task and add checklist buttons (but race condition persists, despite updateCache)
 
## [2.0.0.a16] @dwertheimer
- Changed StatusIcon to output a <span> rather than a <div> per your note in Discord
- Implemented the sectionItem generation function and refactored the dupe code getSectionItemObject()
- You wrote: "please turn off "Root: type: SET_DATA payload" logging", what's weird is that it's already off. I removed virtually all logging in Root and re-released np.Shared. I would suggest you delete your np.Shared folder and re-download it. You should be seeing np.Shared 0.5.10 
- You wrote "dataGeneration::copyUpdatedSectionItemData() appears to be doing the wrong thing for toggleType...". I made a bunch of changes to make the updating on the back end more resilient and the rendering on the front-end better also
- UPDATE_LINE_IN_JSON: Now all the paragraph details, including priority and rawContent etc are updated after a change to the para. Have a look at updateReactWindowFromLineChange() -- and hopefully fix the Flow issue there
- Added a useEffect to the StatusIcon component to watch for external changes to the icon's status -- even when the JSON was updated underneath, the fa-icon class wasn't changing. Now it is.
- Added visual feedback for REFRESH_ALL_CALENDAR_SECTIONS, refreshing sections sequentially
- You wrote: figure out why CommandButton isn't working as expected - I got it to send the messages. You just need to do the back-end clickHandlers. The data payload looks like this: `{actionType: addTask|addChecklist etc., toFilename:xxxxx}`. I used actionFunctionParam because that's what it was called before but you may instead want to use one of the existing MessageObject fields, e.g. "toFilename" 

## [2.0.0.a15] @jgclark
- added logic to task dialog for conditional display of 'cancel' and 'toggle type' buttons
- more clean up of types and previous HTML data passing mechanism
- partially fixed toggleType button (though see below)
- turned off logging in Section component
- reverted recent dialog layout and CSS; this involved turning off the new StatusIcon in the dialog
- fixed CSS for CalendarPicker to work in dark mode, and look a bit nicer. More to do.
- restored size of icon circle and square from before ~a6
- fixed 'add' buttons getting very wide on <500px
- failed to fix why CommandButton aren't doing anything

**TODO(dbw):**
- please turn off "Root: type: SET_DATA payload" logging
- figure out why dataGeneration::copyUpdatedSectionItemData() appears to be doing the wrong thing for toggleType when called by pluginToHTMLBridge::updateReactWindowFromLineChange().  Logging shows that "new JSON item" is the same as "old JSON item"
- figure out why CommandButton isn't working as expected. I've had a go but failed. See more detailed comments and FIXME in the code.

## [2.0.0.a14] @dbw
- abstracted the status icon into its own component StatusIcon so it can be re-used
- fixed iphone settings not working
- fixed some css tweaks (Dialog still needs some styling refinements)
- fixed dropdown menu flashing open. needed to display:none and then display:block when it is open
- fixed some layout issues on the dialog menu
- removed w3.css because it was conflicting
- continued to clean up types and remove flow errors
- we need to test/fix/implement each of the clickActions

## [2.0.0.a13] @dbw
- Fixed the open note by title that broke in the refactor of actionType
- Fixed the broken note links to items that were not daily notes (e.g. weekly note links did not work) - was using a helper function getISODateStringFromYYYYMMDD(), but I changed it to use note.title
- Added a click on the title of the task dialog to open the underlying note
- Fix some types issues that were causing issues left over from the refactor
- Added content refreshing from server when dialog box is open (e.g. priority flip, content update, etc.) -- this turned out to be quite challenging :)
- Added some animation to the dialog opening/closing

## [2.0.0.a12] @dbw
- fixed some small things, but one big thing. conditional loading of data on load is back the way you wanted it. If you have the setting off, it doesn't pull the data on the initial load. if you then turn it on with a show* setting, it calls refreshSomeSections() and adds that section to the existing JSON. 

## [2.0.0.a11] @dbw
- fixed the React side of the bug that was keeping data from displaying
- fixed the bug on the data generation side that was keeping a lot of the data from generating
- added sharedData to plugin.json and to context, added reading/initializing/setting functions
- refactored all the reactSettings calls to be sharedData calls instead
- the specific settings should be added to TDashboardSettings in types
- ran around in circles trying to figure out why it was refreshing in an endless loop. then figured out that there was some old refresh dashboard code on a settings change, so every time i flipped one switch, it looped forever reloading reloading. i commented out the onSettingsUpdated refresh code.
- As of now, reactSettings is used only for things that are react-only (like dialogData which is used to open the dialog with certain info)
- sharedData holds all the values that you created/saved
- Both are stringified and saved to DataStore.settings in fields "sharedSettings" and "reactSettings". This way even reactSettings can persist (though currently it doesn't matter)

  "reactSettings" : "{\"lastChange\":\"_Saving\",\"dialogData\":{\"isOpen\":false,\"isTask\":true,\"details\":{}}}",

  "sharedSettings" : "{\"lastChange\":\"ignoreChecklistItems change\",\"ignoreChecklistItems\":true,\"showYesterdaySection\":true,\"showWeekSection\":false,\"showTagSection\":false,\"filterPriorityItems\":false,\"hideDuplicates\":false,\"showTomorrowSection\":false,\"showMonthSection\":true,\"showQuarterSection\":false,\"showOverdueSection\":true,\"showProjectSection\":false}",


## [2.0.0.a10] @jgc
- added shared::getCombinedSettings() function. **HELP: how to get sharedSettings into appContext, so it can be picked up in Section?**
- added all sections (except TD and COUNT) to the Dropdown menu. Note: These are now called e.g. showTodaySection not earlier e.g. show_today -- this is to align with existing naming in our setting.json files.
- fixed regression on spacing around icons in dialogs
- changed `item.sectionType` to `item.sectionCode` which is slightly more accurate

## [2.0.0.a9] @dbw
- NOTE: ADDED CALENDAR PICKER AND A ROLLUP CSS PLUGIN SO YOU WILL NEED TO PULL, `npm i` and RESTART THE BUILD/ROLLUP SCRIPTS
- Fixed the header CSS so it looks right again
- Added close X at top right instead of close button - can probably use some jgclark styling
- added cog and dropdown menu to hide UI switches
- implemented "hide duplicates" switch which keeps items under one heading (TAG first, then today, then others...)
- created show/hide button for each section in the sections object
- added reactSettings setting in plugin.json to keep track of your last UI settings. eventually will need to combine with plugin settings depending on what jgclark wants to do
- added calendar picker to the dialog box and implemented back end to reschedule a task to that date. Though leaving jgclark a note about doUpdateTaskDate()
- fixed flow errors for `onClick` in AddButtons 
- fixed the lastUpdated in Root (should not have been changed, as lastFullRefresh is only used in this plugin and Root is generic)


## [2.0.0-a8] @jgc + @dw
- Major update to data types, including introduction of TItemType, TProjectForDashboard, TControlStrings, TActionOnReturn, TActionType, and their introduction in almost all files
- Major refactoring of bridgeClickDashboardItem contents into separate do... functions in clickHandlers.js
- added ability to refresh specified sections (`getSomeSectionsData`) not just all of them (`getAllSectionsData`)
- JSON data items can now be deleted as well as updated
- fix to icon horizontal positioning in dialogs
- fix to some button icon positioning in dialogs
- in tasks dialog calendar notes' titles are now hyphenated
- fixed a bunch of other flow errors

## [2.0.0-a7] @dw
- Moved the first few clickHandlers from the massive pluginToHTMLBridge to a clickHandlers file. 
- Started to work on a standardized return object from the handlers so there is not a ton of repeated code in each handler (e.g. update the JSON, refresh, etc.). It's a WIP
- only doCompleteTask and doContentUpdate are using the new concept. I'm on the fence about it. Look forward to discussing.
- Added line at end of massive switch statement in router:
    if (result) await processActionOnReturn(result, data) // process all actions based on result of handler


## [2.0.0-a5] @dw
- Dialog: Got CompleteThen to work
- Dialog: Got Unschedule to work
- Dialog: Got Cancel to work
- Dialog: Wrote JS to position the dialog perfectly relative to click
- Dashboard css: bring header z-index up to float above all elements
- Major React Refactor: Break down ItemRow to be much more modular so that Projects and Tasks are not mixed together. 
- TaskItem is now much more readable and understandable and does not have the multiple if's and multiple return statements.
- NOTE: to that end, I try to keep my React Components to a single return statement (do any if's above in the code) so if you want to see what is rendering in a component, you jump to the bottom of the file and it's always right there
- New React Components: Task Item, Review Item, Tasks Filtered, NoTasks
- Created a generalized shared/singleton auto refresh timer that allows for refresh to be called for by any component with a debounce so that only the last request counts down and you don't get 5 refreshes if you quickly click 5 tasks.
- Cleaned up lots of Flow errors (still some more to go)

## [2.0.0-a4] @dw
- Refresh button now works, refreshing all content via JSON passing only :)
- Task Dialog: Updating text and clicking "update" refreshes JSON
- Single line update scaffolding is in place, but only text updates trigger it so far
- Note: single-line updates do not reset the "last updated" counter, because it feels to me like that should only reset when all the content is pulled anew. Let me know if you feel differently
- I added a 5s delayed auto refresh hack to try to get around the updateCache bug. After clicking any button on the dialog, the JSON data does a full refresh 5s later no matter what. We can get rid of this when the single-line refreshes on the plugin/server side are all implemented.
- I added a "refreshing" message when this happens so you know what's going on.

## [2.0.0-a3] @dw
- reactSettings is working. See Header component for how to import/read/set it. Still refreshing more often than I would like. Something we will address as an optimization down the road...The user won't see it. The logs are just noisy. Speaking of which, would be good if you could turn off some of the debug logging in the loop
- Dialogs have now been split and modularized. I have worked on the Tasks dialog as an example for you. Have not touched the Projects one other than splitting it out
- I have the notes opening when clicking on a task, and the command buttons from the dialogs working
- Dialog commands that have been tested/work: today, +1d, +1b, this week, +1w, +2w, this month, this qtr, move-to, priority up, priority down, toggle type, 
- Dialog commands that do not work and need your help: Cancel, Complete Then, Unschedule. 
[editing text -- this is a big one that i will figure out]

## [2.0.0-a3] @SirTristam 2024-04-30
- Correct date handling when rescheduling or moving tasks.
- Fix error using the 'All Today -> Tomorrow' button.

## [2.0.0-a2] @jgclark 2024-04-19
- ShowTimeAgo:
    - moved showTimeAgo from a free-standing JS to being part of the Header react component
    - moved file from requiredFiles to react/support)
    - removed the body onLoad that loads it -- now loads when the Header loads
    - removed it from preBodyScript
- Actions not working: You were correct. Had to find the one thing. The command we need to use to talk to the plugin from React is sendActionToPlugin(), but to have access to that command/function, we need to pull it out of the React context. So each component that needs to talk to the plugin should:
    a) import { useAppContext } from './AppContext.jsx'
    and then inside the component:
    b)  const { sendActionToPlugin } = useAppContext()
    c) then in any click handler you can call it like:
        `onClick={() => sendActionToPlugin('showNoteInEditor', dataObjectToPassToFunction)}`
    d) the catcher/router on the other side is in reactMain.js, onMessageFromHTMLView() where there is a 'case' statement for each command fires off a command. Since you already have a function for that, bridgeClickDashboardItem(), I just put a default routing in onMessageFromHTMLView() to send everything to your function
- The "Open this note in Editor" clicks now work, so you can follow the thread: ItemNoteLink > sendActionToPlugin >  onMessageFromHTMLView > 

- NOTE: there is a circular dependency which needs to be sorted out into a 3rd file perhaps. Did not have time to look at this. must sleep.

## [2.0.0-a1] @jgclark 2024-04-07
- Brought across demoDashboard.js to experiment with forming JSON to sent to React
-->

## [1.2.1] - 2024-04-18 by @SirTristam
- Add option to use the current date instead of '>today' to schedule tasks for today
