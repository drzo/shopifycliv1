import {ensureDevContext} from '../context.js'
import {load, writeConfigurationFile} from '../../models/app/loader.js'
import {fetchSpecifications} from '../generate/fetch-extension-specifications.js'
import {configurationFileNames} from '../../constants.js'
import {mergeAppConfiguration} from '../merge-configuration.js'
import {Config} from '@oclif/core'
import {ensureAuthenticatedPartners} from '@shopify/cli-kit/node/session'
import {renderSuccess} from '@shopify/cli-kit/node/ui'
import {fileExists, writeFileSync} from '@shopify/cli-kit/node/fs'
import {relativePath} from '@shopify/cli-kit/node/path'

export interface PullConfigOptions {
  commandConfig: Config
  directory: string
  appEnv: string
}

export default async function pullConfig(options: PullConfigOptions): Promise<void> {
  const configPath = `${options.directory}/${configurationFileNames.app}`
  const configExists = await fileExists(configPath)

  if (!configExists) {
    writeFileSync(configPath, '')
  }
  const token = await ensureAuthenticatedPartners()
  const {remoteApp} = await ensureDevContext({...options, reset: false}, token, true)
  const apiKey = remoteApp.apiKey
  const specifications = await fetchSpecifications({token, apiKey, config: options.commandConfig})
  const app = await load({directory: options.directory, specifications})

  const mergedLocalApp = mergeAppConfiguration(app, remoteApp)

  const file = writeConfigurationFile({...mergedLocalApp}, options.appEnv)

  renderSuccess({
    headline: `App configuration synced from "${remoteApp.title}" into ${relativePath(mergedLocalApp.directory, file)}`,
  })
}
