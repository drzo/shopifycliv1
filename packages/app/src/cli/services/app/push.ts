import {fetchSpecifications} from '../generate/fetch-extension-specifications.js'
import {load, writeConfigurationFile} from '../../models/app/loader.js'
import {AppInterface} from '../../models/app/app.js'
import {AppUpdateMutation, AppUpdateMutationSchema, AppUpdateMutationVariables} from '../../api/graphql/app_update.js'
import {ensureDevContext} from '../context.js'
import {mergeAppConfiguration} from '../merge-configuration.js'
import {OrganizationApp} from '../../models/organization.js'
import {generatePartnersURLs} from '../dev/urls.js'
import {ensureAuthenticatedPartners} from '@shopify/cli-kit/node/session'
import {Config} from '@oclif/core'
import {AbortError} from '@shopify/cli-kit/node/error'
import {partnersRequest} from '@shopify/cli-kit/node/api/partners'
import {renderSuccess, renderWarning} from '@shopify/cli-kit/node/ui'
import {relativePath} from '@shopify/cli-kit/node/path'

export interface PushConfigOptions {
  commandConfig: Config
  directory: string
  appEnv: string
}

type UpdatedApp = AppUpdateMutationSchema['appUpdate']['app']

export default async function pushConfig(options: PushConfigOptions): Promise<void> {
  const token = await ensureAuthenticatedPartners()
  const {remoteApp} = await ensureDevContext({...options, reset: false}, token, true)
  const apiKey = remoteApp.apiKey
  const specifications = await fetchSpecifications({token, apiKey, config: options.commandConfig})
  const app = await load({directory: options.directory, specifications, appConfigName: options.appEnv})

  printDiff(app, remoteApp)

  const updatedApp = await pushAndWriteConfig(app, apiKey, token)

  printResult(updatedApp, remoteApp)
}

export async function pushAndWriteConfig(app: AppInterface, apiKey: string, token: string): Promise<AppInterface> {
  const updatedApp = await pushToPartners(app, apiKey, token)

  const mergedApp = mergeAppConfiguration(app, {...updatedApp})
  writeConfigurationFile(mergedApp, app.appEnv)
  return mergedApp
}

async function pushToPartners(app: AppInterface, apiKey: string, token: string): Promise<UpdatedApp> {
  const webConfig = app.webs.find((web) => web.configuration.type === 'backend')?.configuration
  const appConfig = app.configuration

  const variables: AppUpdateMutationVariables = {
    apiKey,
    applicationUrl: appConfig?.urls?.applicationUrl || '',
    appProxy: {
      proxyUrl: appConfig?.appProxy?.url || '',
      proxySubPath: appConfig?.appProxy?.subPath || '',
      proxySubPathPrefix: appConfig?.appProxy?.subPathPrefix || '',
    },
  }
  if (appConfig.webhookApiVersion) variables.webhookApiVersion = appConfig.webhookApiVersion
  if (appConfig.gdprWebhooks?.customerDeletionUrl)
    variables.gdprWebhooksCustomerDeletionUrl = appConfig.gdprWebhooks?.customerDeletionUrl
  if (appConfig.gdprWebhooks?.customerDataRequestUrl)
    variables.gdprWebhooksCustomerDataRequestUrl = appConfig.gdprWebhooks?.customerDataRequestUrl
  if (appConfig.gdprWebhooks?.shopDeletionUrl)
    variables.gdprWebhooksShopDeletionUrl = appConfig.gdprWebhooks?.shopDeletionUrl

  if (appConfig?.urls?.applicationUrl) {
    const url = new URL(appConfig?.urls?.applicationUrl)

    const {redirectUrlWhitelist} = generatePartnersURLs(url.origin, appConfig?.urls?.authCallbackPath)
    variables.redirectUrlWhitelist = redirectUrlWhitelist
  }

  if (appConfig?.urls?.preferencesUrl) variables.preferencesUrl = appConfig?.urls?.preferencesUrl

  const query = AppUpdateMutation
  const result: AppUpdateMutationSchema = await partnersRequest(query, token, variables)
  if (result.appUpdate.userErrors.length > 0) {
    const errors = result.appUpdate.userErrors.map((error) => error.message).join(', ')
    throw new AbortError(errors)
  }
  return result.appUpdate.app
}

function printDiff(
  app: AppInterface,
  remoteConfig: Omit<OrganizationApp, 'apiSecretKeys'> & {apiSecret?: string | undefined},
): void {
  const remoteItems = []
  const localItems = []

  const appConfig = app.configuration

  // eslint-disable-next-line no-warning-comments
  // TODO: do this smartly
  if (appConfig?.urls?.applicationUrl !== remoteConfig.applicationUrl) {
    remoteItems.push(`App URL:                     ${remoteConfig.applicationUrl}`)
    localItems.push(`App URL:                     ${appConfig?.urls?.applicationUrl}`)
  }

  if (remoteItems.length === 0) return
  renderWarning({
    headline: 'Some of your app’s local configurations are different than they are on Shopify',
    customSections: [
      {title: 'The configurations on Shopify are', body: {list: {items: remoteItems}}},
      {title: 'Your local configurations are', body: {list: {items: localItems}}},
    ],
  })
}

function printResult(
  app: AppInterface,
  remoteApp: Omit<OrganizationApp, 'apiSecretKeys'> & {apiSecret?: string | undefined},
): void {
  const appConfig = app.configuration

  renderSuccess({
    headline: `App configuration updated · ${remoteApp.title} · ${relativePath(app.directory, app.configurationPath)}`,
    customSections: [{title: 'App URL', body: {list: {items: [appConfig?.urls?.applicationUrl || '']}}}],
  })
}
