import Command from '@shopify/cli-kit/node/base-command'
import {Command as oclifCommand} from '@oclif/core'
import {mkdir, rmdir, writeFile} from '@shopify/cli-kit/node/fs'
import {cwd, joinPath} from '@shopify/cli-kit/node/path'
import {outputInfo} from '@shopify/cli-kit/node/output'

const docsPath = joinPath(cwd(), '/docs-shopify.dev/commands')

export type CommandWithMarkdown = oclifCommand.Loadable & {descriptionWithMarkdown?: string}

export interface CommandData {
  commandName: string
  fileName: string
  interfaceName: string
  hasTopic: boolean
  topic: string | undefined
  hasFlags: boolean
}

export default class DocsGenerate extends Command {
  static description = 'Generate CLI commands documentation'
  static hidden = true

  async run(): Promise<void> {
    const commands = this.config.commands as CommandWithMarkdown[]

    // Remove all files and recreate the folder. To make sure we don't leave any orphaned files.
    await rmdir(docsPath)
    await mkdir(docsPath)

    // Short by length to ensure that we first generate the interfaces for the parent topics to detect hidden ones.
    const sortedCommands = commands
      .sort((ca, cb) => ca.id.length - cb.id.length)
      .filter((command) => !isHidden(command))
    const promises = sortedCommands.flatMap((command) => {
      const commandData = extractCommandData(command)
      return [
        writeCommandFlagInterface(command, commandData),
        writeCommandUsageExampleFile(command, commandData),
        writeCommandDocumentation(command, commandData),
      ]
    })

    await Promise.all(promises)
  }
}

// By default we hide oclif commands that are not part of the Shopify CLI documentation
const hiddenTopics: string[] = ['commands', 'help', 'plugins']

// Topics that are included in the general commands category
const generalTopics: string[] = ['config', 'auth']

function isHidden(command: oclifCommand.Loadable) {
  // Some commands rely on the hidden property of the parent topic, but is not returned in the oclif command object
  if (command.hidden) {
    hiddenTopics.push(command.id)
    return true
  }

  // User plugins are installed locally and are not part of the Shopify CLI documentation
  if (command.pluginType === 'user') return true
  return hiddenTopics.some((topic) => command.id.startsWith(`${topic}:`))
}

export function extractCommandData(command: CommandWithMarkdown) {
  const commandName = command.id.replace(/[:]/g, ' ')
  const fileName = command.id.replace(/[:]/g, '-')
  const interfaceName = command.id.replace(/[:-]/g, '')
  const hasTopic = command.id.includes(':')
  const topic = command.id.split(':')[0]
  const hasFlags = command.flags && Object.keys(command.flags).length > 0
  return {commandName, fileName, interfaceName, hasTopic, topic, hasFlags}
}

// Generates the documentation for a command and writes it to a file (also a file with an example usage of the command)
export async function writeCommandDocumentation(
  command: CommandWithMarkdown,
  {commandName, fileName, interfaceName, hasTopic, topic, hasFlags}: CommandData,
) {
  const flagDoc = `
  {
    title: 'Flags',
    description: 'The following flags are available for the \`${commandName}\` command:',
    type: '${interfaceName}',
  },`

  const description = command.descriptionWithMarkdown ?? command.description ?? command.summary ?? ''
  const cleanDescription = description?.replace(/`/g, '\\`').replace(/https:\/\/shopify\.dev/g, '')
  const previewDescription = command.summary ?? description ?? ''
  const cleanPreview = previewDescription.replace(/`/g, '\\`').replace(/https:\/\/shopify\.dev/g, '')

  const category = hasTopic && !generalTopics.includes(topic!) ? topic : 'general commands'

  const string = `// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: '${commandName}',
  description: \`${cleanDescription}\`,
  overviewPreviewDescription: \`${cleanPreview}\`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: '${commandName}',
          code: './examples/${fileName}.example.sh',
          language: 'bash',
        },
      ],
      title: '${commandName}',
    },
  },
  definitions: [${hasFlags ? flagDoc : ''}
  ],
  category: '${category}',
  related: [
  ],
}

export default data`

  await writeFile(`${docsPath}/${fileName}.doc.ts`, string)
  outputInfo(`Generated docs for ${commandName}`)
}

// Generates an interface for the flags of a command and writes it to a file
export async function writeCommandFlagInterface(
  command: oclifCommand.Loadable,
  {fileName, interfaceName}: CommandData,
) {
  const flagsDetails = Object.keys(command.flags)
    .map((flagName) => {
      const flag = command.flags[flagName]
      if (!flag) return
      if (flag.hidden) return
      const flagDescription = flag.description || ''
      const char = flag.char ? `-${flag.char}, ` : ''
      const type = flag.type === 'option' ? 'string' : "''"
      const value = flag.type === 'option' ? ' <value>' : ''
      const optional = flag.required ? '' : '?'
      const flagContent = `  /**
   * ${flagDescription}
   */
  '${char}--${flagName}${value}'${optional}: ${type}`
      // Example output: '-c, --config <value>'?: string
      return flagContent
    })
    .filter((str) => str && str?.length > 0)
    .join('\n\n')

  const commandContent = `// This is an autogenerated file. Don't edit this file manually.
export interface ${interfaceName} {
${flagsDetails}
}
`
  await mkdir(`${docsPath}/interfaces`)
  await writeFile(`${docsPath}/interfaces/${fileName}.interface.ts`, commandContent)
}

// Generates a file with an example usage of a command
export async function writeCommandUsageExampleFile(command: CommandWithMarkdown, {fileName, commandName}: CommandData) {
  let usage = ''
  const hasFlags = command.flags && Object.keys(command.flags).length > 0
  if (typeof command.usage === 'string') {
    usage = command.usage
  } else if (Array.isArray(command.usage)) {
    usage = command.usage.join('\n\n')
  } else {
    usage = `shopify ${commandName}${hasFlags ? ' [flags]' : ''}`
  }
  await mkdir(`${docsPath}/examples`)
  await writeFile(`${docsPath}/examples/${fileName}.example.sh`, usage)
}
