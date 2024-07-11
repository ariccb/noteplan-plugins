// @flow
const fs = require('fs')
const path = require('path')
const supernote = require('supernote-typescript')

async function supernoteToNotePlanSync(): Promise<void> {
  const settings = DataStore.settings

  const supernoteParentStoragePath = settings.supernote_parent_storage_path
  const supernotePath = path.join(supernoteParentStoragePath, 'Supernote', 'Note')
  const supernoteToolImageConversionType = settings.supernote_tool_image_conversion_type // Set this to either "png" or "pdf"
  const notesApplicationStoragePath = settings.notes_application_storage_path
  const notesApplicationFileExt = settings.notes_application_file_ext
  const notesApplicationInboxPath = settings.notes_application_inbox_path
  const notesApplicationAttachmentSuffix = '_attachments'
  const returnLine = '\n'

  const failedConversions = []
  const successfulConversions = []

  function getFileId(filePath) {
    const content = fs.readFileSync(filePath)
    const match = content.toString().match(/<FILE_ID:(.*?)>/)
    return match ? match[1] : null
  }

  function findExistingMarkdown(fileId) {
    const notes = DataStore.projectNotes
    for (const note of notes) {
      if (note.content.includes(fileId)) {
        return note
      }
    }
    return null
  }

  async function extractTextFromNote(noteFilePath, textOutputPath) {
    try {
      await supernote.convert({
        input: noteFilePath,
        output: textOutputPath,
        format: 'txt',
      })
      if (fs.existsSync(textOutputPath) && fs.statSync(textOutputPath).size > 0) {
        console.log(`Text extracted successfully to ${textOutputPath}`)
        return true
      } else {
        console.log(`Text extraction produced an empty file for ${noteFilePath}`)
        return false
      }
    } catch (error) {
      console.error(`Error extracting text from ${noteFilePath}:`, error)
      return false
    }
  }

  function createNewMarkdownFile(note, noteFileNameWithoutExt, noteTags, formattedNoteCreatedDate) {
    const content = `---${returnLine}title: ${noteFileNameWithoutExt} ${returnLine}aliases:${returnLine}tags: #${noteTags}${returnLine}created: ${formattedNoteCreatedDate}${returnLine}---${returnLine}#### Source:${returnLine}#### Next:${returnLine}#### Branch:${returnLine}#### ---${returnLine}- [ ] File Incoming SuperNote ${noteFileNameWithoutExt} >today${returnLine}${returnLine}## Supernote Sync - Do Not Edit Below This Line${returnLine}---${returnLine}### Supernote Text Recognition Results${returnLine}${returnLine}### SuperNote Exported Images${returnLine}`
    note.content = content
  }

  function updateExistingMarkdownFile(note) {
    const syncStart = note.content.indexOf('## Supernote Sync - Do Not Edit Below This Line')
    if (syncStart !== -1) {
      note.content = note.content.slice(0, syncStart)
    }
    note.content += `${returnLine}${returnLine}## Supernote Sync - Do Not Edit Below This Line${returnLine}---${returnLine}### Supernote Text Recognition Results${returnLine}${returnLine}### SuperNote Exported Images${returnLine}`
  }

  function appendNewText(note, newText) {
    const startPosition = note.content.indexOf('### Supernote Text Recognition Results')
    const endPosition = note.content.indexOf('### SuperNote Exported Images')
    if (startPosition !== -1 && endPosition !== -1) {
      note.content = note.content.slice(0, startPosition + '### Supernote Text Recognition Results\n\n'.length) + newText + '\n\n' + note.content.slice(endPosition)
    } else {
      note.content += `\n\n### Supernote Text Recognition Results\n\n${newText}\n\n### SuperNote Exported Images\n`
    }
  }

  function appendErrorMessage(note, errorMessage, section) {
    const insertPosition = note.content.indexOf(section)
    if (insertPosition !== -1) {
      note.content = note.content.slice(0, insertPosition + section.length + 2) + errorMessage + '\n\n' + note.content.slice(insertPosition + section.length + 2)
    } else {
      note.content += `\n\n${section}\n\n${errorMessage}`
    }
  }

  async function convertNoteToImages(noteFilePath, outputFolder, fileId) {
    const maxAttempts = 100
    const generatedFiles = []
    for (let page = 0; page < maxAttempts; page++) {
      const outputFilePath = path.join(outputFolder, `${fileId}_${page}.${supernoteToolImageConversionType}`)
      try {
        await supernote.convert({
          input: noteFilePath,
          output: outputFilePath,
          format: supernoteToolImageConversionType,
        })
        if (fs.existsSync(outputFilePath)) {
          generatedFiles.push(outputFilePath)
        } else {
          break
        }
      } catch (error) {
        console.error(`Error converting ${noteFilePath} to ${supernoteToolImageConversionType.toUpperCase()}:`, error)
        break
      }
    }
    return generatedFiles
  }

  function appendImageReferences(note, imageReferences) {
    const startPosition = note.content.indexOf('### SuperNote Exported Images')
    if (startPosition !== -1) {
      note.content = note.content.slice(0, startPosition + '### SuperNote Exported Images\n'.length) + imageReferences.join('\n') + '\n'
    } else {
      note.content += `\n\n### SuperNote Exported Images\n${imageReferences.join('\n')}\n`
    }
  }

  function syncNoteToCorrectFolder(noteFile, fileId, noteFileNameWithoutExt, noteCreatedDate) {
    const relativePath = path.relative(supernotePath, noteFile)
    const noteFolder = path.dirname(relativePath)
    const noteFolderPath = path.join(notesApplicationStoragePath, noteFolder)
    if (!fs.existsSync(noteFolderPath)) {
      fs.mkdirSync(noteFolderPath, { recursive: true })
    }
    const newMarkdownFilePath = path.join(noteFolderPath, `${noteFileNameWithoutExt}${notesApplicationFileExt}`)
    const noteTags = noteFolder.replace(/ /g, '').toLowerCase().replace(/\//g, '/')
    const formattedNoteCreatedDate = noteCreatedDate.toISOString().split('T')[0]
    const note = DataStore.newNote(`${noteFileNameWithoutExt}${notesApplicationFileExt}`, noteFolderPath)
    createNewMarkdownFile(note, noteFileNameWithoutExt, noteTags, formattedNoteCreatedDate)
    return note
  }

  const noteFiles = fs
    .readdirSync(supernotePath, { withFileTypes: true })
    .filter((file) => file.isFile() && file.name.endsWith('.note'))
    .map((file) => path.join(supernotePath, file.name))

  for (const noteFile of noteFiles) {
    console.log(`\nProcessing file: ${noteFile}`)
    const fileId = getFileId(noteFile)
    if (!fileId) {
      console.warn(`Warning: Could not find FILE_ID in ${noteFile}. Skipping.`)
      failedConversions.push(noteFile)
      continue
    }

    const noteFileNameWithoutExt = path.basename(noteFile, '.note').trim()
    const noteCreatedDate = new Date(fs.statSync(noteFile).ctime)

    let existingMarkdownFile = findExistingMarkdown(fileId)
    if (!existingMarkdownFile) {
      existingMarkdownFile = syncNoteToCorrectFolder(noteFile, fileId, noteFileNameWithoutExt, noteCreatedDate)
    } else {
      updateExistingMarkdownFile(existingMarkdownFile)
    }

    const attachmentsPath = existingMarkdownFile.filename.replace(notesApplicationFileExt, notesApplicationAttachmentSuffix)
    if (!fs.existsSync(attachmentsPath)) {
      console.log(`Creating new folder: ${attachmentsPath}`)
      fs.mkdirSync(attachmentsPath, { recursive: true })
    }

    const textOutputPath = path.join(attachmentsPath, `${fileId}_text.txt`)
    let textExtracted = await extractTextFromNote(noteFile, textOutputPath)
    if (!textExtracted) {
      console.log(`Retrying text extraction for ${noteFile}`)
      textExtracted = await extractTextFromNote(noteFile, textOutputPath)
      if (!textExtracted) {
        const errorMessage = `This .note file was not created using the Real-Time Recognition file type, so no text was able to be output\n${noteFile}`
        appendErrorMessage(existingMarkdownFile, errorMessage, '### Supernote Text Recognition Results')
        console.error(`Failed to extract text from ${noteFile} after retrying`)
        failedConversions.push(noteFile)
        continue
      }
    }

    if (textExtracted && fs.existsSync(textOutputPath)) {
      const newText = fs.readFileSync(textOutputPath, 'utf-8')
      if (newText.trim()) {
        appendNewText(existingMarkdownFile, newText)
        console.log(`Updated text for ${noteFileNameWithoutExt}`)
        console.log(JSON.stringify({ text_recognition_results: newText }))
      } else {
        console.log(`Extracted text is empty for ${noteFileNameWithoutExt}`)
      }
    } else {
      console.log(`Text file not created for ${noteFileNameWithoutExt}`)
    }

    console.log(`Attempting to convert ${noteFile} to ${supernoteToolImageConversionType.toUpperCase()}`)
    let generatedFiles = await convertNoteToImages(noteFile, attachmentsPath, fileId)
    if (!generatedFiles.length) {
      console.log(`Retrying image conversion for ${noteFile}`)
      generatedFiles = await convertNoteToImages(noteFile, attachmentsPath, fileId)
      if (!generatedFiles.length) {
        const errorMessage = `The .note file conversion to images failed for some reason. Error output: ${noteFile}`
        appendErrorMessage(existingMarkdownFile, errorMessage, '### SuperNote Exported Images')
        console.error(`Failed to convert ${noteFile} to ${supernoteToolImageConversionType.toUpperCase()} after retrying`)
        failedConversions.push(noteFile)
        continue
      }
    }

    console.log(`Successfully converted ${noteFileNameWithoutExt} to ${supernoteToolImageConversionType.toUpperCase()}`)

    const imageReferences = generatedFiles.map((fileName) => {
      const relativePath = `${noteFileNameWithoutExt}_attachments/${path.basename(fileName)}`
      return `![image](${relativePath})`
    })

    if (imageReferences.length) {
      appendImageReferences(existingMarkdownFile, imageReferences)
      console.log(`Added ${imageReferences.length} ${supernoteToolImageConversionType.toUpperCase()} references to ${existingMarkdownFile}`)
    } else {
      console.log(`No ${supernoteToolImageConversionType.toUpperCase()} files were found for ${noteFileNameWithoutExt}`)
    }

    successfulConversions.push(noteFile)
    console.log(`Finished processing ${noteFile}`)
    console.log('-----------------------------------')
  }

  console.log('\nConversion Summary:')
  console.log(`Total files processed: ${noteFiles.length}`)
  console.log(`Successful conversions: ${successfulConversions.length}`)
  console.log(`Failed conversions: ${failedConversions.length}`)

  if (failedConversions.length) {
    console.log('\nThe following files failed conversion:')
    for (const file of failedConversions) {
      console.log(file)
    }
  } else {
    console.log('\nAll files were converted successfully.')
  }

  console.log('Script completed.')
}

export { supernoteToNotePlanSync }
