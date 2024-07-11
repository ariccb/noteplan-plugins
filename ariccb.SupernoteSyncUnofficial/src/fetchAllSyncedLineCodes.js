// @noflow

const fs = require('fs')
const path = require('path')

export function fetchAllSyncedLineCodes() {
  // prints a list of all the synced lines codes
  const referencedBlocks = DataStore.referencedBlocks()
  const syncLines = referencedBlocks.map((block) => block.content.split('^')[1].substring(0, 6))

  // Define the path to the output file
  const outputDir = path.join(DataStore.pluginFolder(), 'ariccb.SupernoteSyncUnofficial')
  const outputFile = path.join(outputDir, 'syncedLines.json')

  // Make sure the directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Convert the sync lines array to JSON format
  const syncLinesJson = JSON.stringify(syncLines, null, 2)

  // Write the JSON string to the file
  fs.writeFileSync(outputFile, syncLinesJson, 'utf8')

  // Optionally output to the console for verification
  console.log(`Synced lines saved to ${outputFile}`)
}

export async function insertSyncedLineCodes() {
  await Editor.insertTextAtCursor(await fetchAllSyncedLineCodes())
}
