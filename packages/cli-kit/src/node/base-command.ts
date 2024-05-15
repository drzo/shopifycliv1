import {readAndParseDotEnv} from './dot-env.js'
import {errorHandler, registerCleanBugsnagErrorsFromWithinPlugins} from './error-handler.js'
import {content, info, token} from '../output.js'
import {findUp, join as pathJoin} from '../path.js'
import {exists as fileExists, read as fileRead} from '../file.js'
import {decode as decodeTOML} from '../toml.js'
import {homeDirectory, isDebug} from '../environment/local.js'
import {Command, Interfaces} from '@oclif/core'

// eslint-disable-next-line import/no-anonymous-default-export
export default abstract class extends Command {
  async catch(error: Error & {exitCode?: number | undefined}) {
    errorHandler(error)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async init(): Promise<any> {
    if (!isDebug()) {
      // This function runs just prior to `run`
      registerCleanBugsnagErrorsFromWithinPlugins(this.config.plugins)
    }
    return super.init()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async parseWithPresets<TF, TA extends {[name: string]: any}>(
    options?: Interfaces.Input<TF>,
    argv?: string[],
  ): Promise<
    Omit<Interfaces.ParserOutput<TF, TA>, 'flags' | 'args'> & {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flags: {[name: string]: any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: {[name: string]: any}
    }
  > {
    const parsed = await super.parse(options, argv)
    const [presetName, flagsFromPreset] = await presetSettings(parsed.flags)
    const presetAddedFlags = Object.keys(flagsFromPreset).filter(
      (key) => !Object.hasOwnProperty.call(parsed.flags, key),
    )
    if (presetName && presetAddedFlags.length > 0) {
      info(content`Applying flags from preset ${token.cyan(presetName)}: ${presetAddedFlags.join(', ')}`)
    }
    const flags = {...flagsFromPreset, ...parsed.flags}
    return {...parsed, flags}
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function presetSettings(flags: {[name: string]: any}): Promise<[string | undefined, {[name: string]: any}]> {
  const presetName: string = flags.preset ?? (await presetNameFromDotEnv(flags.path))
  if (!presetName) return [undefined, {}]
  const globalPresetsFile = pathJoin(homeDirectory(), 'shopify.presets.toml')
  const localPresetsFile = await findUp('shopify.presets.toml', {
    type: 'file',
    cwd: flags.path ?? process.cwd(),
  })
  return [
    presetName,
    {
      ...(await presetFromFile(globalPresetsFile, presetName)),
      ...(await presetFromFile(localPresetsFile, presetName)),
    },
  ]
}

async function presetFromFile(
  filepath: string | undefined,
  presetName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{[name: string]: any}> {
  if (filepath && (await fileExists(filepath))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const presetSettings: {[name: string]: any} = decodeTOML(await fileRead(filepath))
    if (typeof presetSettings[presetName] === 'object') return presetSettings[presetName]
  }
  return {}
}

async function presetNameFromDotEnv(path: string | undefined): Promise<string | undefined> {
  const dotEnvFile = await findUp('.env', {
    type: 'file',
    cwd: path ?? process.cwd(),
  })
  if (!dotEnvFile) return
  const {variables} = await readAndParseDotEnv(dotEnvFile)
  return variables.SHOPIFY_PRESET
}
