import {getAppConfigurationFileName, load as loadApp} from '../../../models/app/loader.js'
import {clearCurrentConfigFile, setCurrentConfigFile} from '../../local-storage.js'
import {selectConfigFile} from '../../../prompts/config.js'
import {AbortError} from '@shopify/cli-kit/node/error'
import {fileExists} from '@shopify/cli-kit/node/fs'
import {joinPath} from '@shopify/cli-kit/node/path'
import {renderSuccess} from '@shopify/cli-kit/node/ui'

export interface UseOptions {
  directory: string
  config?: string
  reset?: boolean
}

export default async function use({directory, config, reset = false}: UseOptions): Promise<void> {
  if (reset) {
    clearCurrentConfigFile(directory)
    renderSuccess({
      headline: 'Cleared current configuration.',
      body: ['In order to set a new current configuration, please run `shopify app config use CONFIG_NAME`.'],
    })
    return
  }

  const configFileName = await getConfigFileName(directory, config)

  if (!configFileName) {
    throw new AbortError('Could not find any shopify.app.toml file in the directory.')
  }

  const configFilePath = joinPath(directory, configFileName)

  const configFileExists = await fileExists(configFilePath)
  if (!configFileExists) {
    throw new AbortError(`Could not find configuration file ${configFileName}`)
  }

  await saveCurrentConfig({configFileName, directory})

  renderSuccess({
    headline: `Using configuration file ${configFileName}`,
  })
}

interface SaveCurrentConfigOptions {
  configFileName: string
  directory: string
}

export async function saveCurrentConfig({configFileName, directory}: SaveCurrentConfigOptions) {
  const app = await loadApp({specifications: [], configName: configFileName, directory, mode: 'strict'})

  if (!app.configuration.client_id) {
    throw new AbortError(`Configuration file ${configFileName} needs a client_id.`)
  }

  setCurrentConfigFile({
    directory,
    configFile: configFileName,
    appId: app.configuration.client_id,
  })
}

async function getConfigFileName(directory: string, config?: string): Promise<string | null> {
  if (config) return getAppConfigurationFileName(config)

  const result = await selectConfigFile(directory)
  return result.isErr() ? null : result.value
}
