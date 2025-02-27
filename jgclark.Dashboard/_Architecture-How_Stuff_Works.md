# Architecture / How Things Work

## Components

Generally speaking the React components are in the components directory. However, when components get large, they are split as follows:
- a folder is created for the component (e.g. "Header")
- the component file is put inside the folder (e.g. Header.jsx)
- the hooks file used by this component are put inside the folder
- the handlers file used by this component are put inside the folder
- an index.js is create that exports the component:
```js
import Header from './Header.jsx'
export default Header 
```
- importing the component then looks like: `import Header from './Header'`

## Settings
As of 2.0.1, there are 4 types of settings:
1. a-few-NP-settings-we-need-to-have-available-when-Noteplan-object-isn't.
1. logLevel used by other helpers + as a fallback
1. things that are only about what sections to display and how they should look.
1. things that control other bits of logic.

These are available through the following functions:
- getDashboardSettings  = 3 + 4, and these can be changed by setSetting(s)
- getNotePlanSettings = 1, and these can't be changed by setSetting(s)
- getLogSettings = 2, and these can only by changed manually in app.

As of 2.0, settings exist in two places (DataStore.settings) and sharedSettings. This is necessary during the time of transition because we want users' 1.0 preferences to not be lost.
- Under the hood, "dashboardSettings" is actually saved in `DataStore.settings.dashboardSettings` in stringified JSON, and parsed when needed on the front-end or back end.
- Any time any change is made to a setting, a useEffect listener, watching for changes to dashboardSettings will fire off a command to update the back-end (DataStore.settings.dashboardSettings) with the latest value.
- For the front-end, settings are defined in the file: 
    `src/settings.js`


## Custom Hooks (src/react/customHooks)

### useInteractiveProcessing (process all tasks)
This is the hook that handles interactive processing of all items in a section
- Section.jsx: 
    - Every section with items gets the button 
    - clicking the button calls handleInteractiveProcessingClick() which sets reactSettings.interactiveProcessing to an object with details (type TInteractiveProcessing)
    - useInteractiveProcessing is loaded by Section.jsx
- useInteractiveProcessing
    - Has effects that monitor reactSettings looking for reactSettings.interactiveProcessing having been set
    - when it's first set, the items to process array is saved
    - the first item is loaded
    - each time a user action on an item closes the dialog, traverses to the next item in the list and opens the dialog 

### useRefreshTimer (Refresh Timer, for calling for refresh after N secs - e.g. after NP cache is updated)
This is a single component that is used in several places to force refreshes after a certain amount of time. It is imported into the Dashboard component and then called in these circumstances:
1. User has autoRefresh turned on. After [15m] of idle time, the Dashboard will automatically do a full (but incremental) refresh
2. User clicked a button on the Task dialog. The timer is set for [5s] and will do a silent full+incremental refresh to make sure that any NP caching on the last command is finished processing and sections are updated. Ideally there are no changes.
3. The back-end (plugin) after processing a command (e.g. "move all overdues to today"), asks for a "START_DELAYED_REFRESH_TIMER" (TActionOnReturn type). This sets a field in pluginSettings (pluginData.startDelayedRefreshTimer = true), which signals the front-end to start the [5s] timer, after which a refresh will be issued
Since all of these use the same singleton customHook, by design any of them will reset any pending timers and the count will start again.

## AutoRefresh - IdleTimer component
The IdleTimer manages the refresh based on inactivity

## CSS Notes

### Platforms
The wrapper class has the name of the platform in the class
- iOS
- macOS
- (I don't know what iPad is)
...so we should be able to style things differently (e.g. `.iOS .header`)

### Z-index
- StatusIcon rollover MetaTooltips: 1001
- Header: 1000
- Dialog: 50
- Tooltips (buttons with tooltips): 20
- Date Picker (.rdp): 10
- combobox-dropdown: 5
- Dropdown Menus (e.g. filter): 1
- dropdown-content: 1

## 