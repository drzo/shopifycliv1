import {saveCurrentConfig} from './use.js'
import {AppInterface, CurrentAppConfiguration, EmptyApp, getAppScopes} from '../../../models/app/app.js'
import {OrganizationApp} from '../../../models/organization.js'
import {selectConfigName} from '../../../prompts/config.js'
import {getAppConfigurationFileName, loadApp} from '../../../models/app/loader.js'
import {InvalidApiKeyErrorMessage, fetchOrCreateOrganizationApp, logMetadataForLoadedContext} from '../../context.js'
import {BetaFlag, fetchAppDetailsFromApiKey} from '../../dev/fetch.js'
import {configurationFileNames} from '../../../constants.js'
import {writeAppConfigurationFile} from '../write-app-configuration-file.js'
import {getCachedCommandInfo} from '../../local-storage.js'
import {PartnersSession, fetchPartnersSession} from '../../context/partner-account-info.js'
import {ExtensionSpecification} from '../../../models/extensions/specification.js'
import {fetchSpecifications} from '../../generate/fetch-extension-specifications.js'
import {loadLocalExtensionsSpecifications} from '../../../models/extensions/load-specifications.js'
import {fetchAppRemoteConfiguration} from '../select-app.js'
import {Config} from '@oclif/core'
import {renderSuccess} from '@shopify/cli-kit/node/ui'
import {AbortError} from '@shopify/cli-kit/node/error'
import {formatPackageManagerCommand} from '@shopify/cli-kit/node/output'
import {deepMergeObjects, isEmpty} from '@shopify/cli-kit/common/object'
import {joinPath} from '@shopify/cli-kit/node/path'

export interface LinkOptions {
  commandConfig: Config
  directory: string
  apiKey?: string
  configName?: string
  baseConfigName?: string
}

export default async function link(options: LinkOptions, shouldRenderSuccess = true): Promise<CurrentAppConfiguration> {
  const {token, remoteApp, directory} = await selectRemoteApp(options)
  const {localApp, configFileName, configFilePath} = await loadLocalApp(options, token, remoteApp, directory)

  await logMetadataForLoadedContext(remoteApp)

  let configuration = mergeAppConfiguration({...localApp.configuration, path: configFilePath}, remoteApp)
  const remoteAppConfigurationFromExtensions = await fetchAppRemoteConfiguration(
    remoteApp.apiKey,
    token,
    localApp.specifications ?? [],
  )
  const replaceLocalArrayStrategy = (_destinationArray: unknown[], sourceArray: unknown[]) => sourceArray
  configuration = deepMergeObjects(configuration, remoteAppConfigurationFromExtensions, replaceLocalArrayStrategy)

  await writeAppConfigurationFile(configuration, localApp.configSchema)
  await saveCurrentConfig({configFileName, directory})

  if (shouldRenderSuccess) {
    renderSuccessMessage(configFileName, remoteApp, localApp)
  }

  return configuration
}

async function selectRemoteApp(options: LinkOptions) {
  const localApp = await loadAppOrEmptyApp(options)
  const directory = localApp?.directory || options.directory
  const partnersSession = await fetchPartnersSession()
  const remoteApp = await loadRemoteApp(localApp, options.apiKey, partnersSession, directory)
  return {
    token: partnersSession.token,
    remoteApp,
    directory,
  }
}

async function loadLocalApp(options: LinkOptions, token: string, remoteApp: OrganizationApp, directory: string) {
  const specifications = await fetchSpecifications({
    token,
    apiKey: remoteApp.apiKey,
  })
  const localApp = await loadAppOrEmptyApp(options, specifications, remoteApp.betas, remoteApp)
  const configFileName = await loadConfigurationFileName(remoteApp, options, localApp)
  const configFilePath = joinPath(directory, configFileName)
  return {
    localApp,
    configFileName,
    configFilePath,
  }
}

async function loadAppOrEmptyApp(
  options: LinkOptions,
  specifications?: ExtensionSpecification[],
  remoteBetas?: BetaFlag[],
  remoteApp?: OrganizationApp,
): Promise<AppInterface> {
  try {
    const app = await loadApp({
      specifications,
      directory: options.directory,
      mode: 'report',
      configName: options.baseConfigName,
      remoteBetas,
    })
    const configuration = app.configuration
    if (remoteApp?.apiKey === configuration.client_id) return app
    return new EmptyApp(await loadLocalExtensionsSpecifications(), remoteBetas, remoteApp?.apiKey)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    return new EmptyApp(await loadLocalExtensionsSpecifications(), remoteBetas)
  }
}

async function loadRemoteApp(
  localApp: AppInterface,
  apiKey: string | undefined,
  partnersSession: PartnersSession,
  directory?: string,
): Promise<OrganizationApp> {
  if (!apiKey) {
    return fetchOrCreateOrganizationApp(localApp, partnersSession, directory)
  }
  const app = await fetchAppDetailsFromApiKey(apiKey, partnersSession.token)
  if (!app) {
    const errorMessage = InvalidApiKeyErrorMessage(apiKey)
    throw new AbortError(errorMessage.message, errorMessage.tryMessage)
  }
  return app
}

async function loadConfigurationFileName(
  remoteApp: OrganizationApp,
  options: LinkOptions,
  localApp: AppInterface,
): Promise<string> {
  const cache = getCachedCommandInfo()

  if (!cache?.askConfigName && cache?.selectedToml) return cache.selectedToml as string

  if (options.configName) {
    return getAppConfigurationFileName(options.configName)
  }

  if (localApp.configuration.client_id.length === 0) {
    return configurationFileNames.app
  }

  const configName = await selectConfigName(localApp.directory || options.directory, remoteApp.title)
  return `shopify.app.${configName}.toml`
}

export function mergeAppConfiguration(
  appConfiguration: CurrentAppConfiguration,
  remoteApp: OrganizationApp,
): CurrentAppConfiguration {
  return {
    ...addLocalAppConfig(appConfiguration, remoteApp),
    ...addBrandingConfig(remoteApp),
    ...addPosConfig(remoteApp),
    ...addRemoteAppWebhooksConfig(remoteApp),
    ...addRemoteAppAccessConfig(appConfiguration, remoteApp),
    ...addRemoteAppProxyConfig(remoteApp),
    ...addRemoteAppHomeConfig(remoteApp),
  }
}

function addRemoteAppHomeConfig(remoteApp: OrganizationApp) {
  const homeConfig = {
    application_url: remoteApp.applicationUrl.replace(/\/$/, ''),
    embedded: remoteApp.embedded === undefined ? true : remoteApp.embedded,
  }
  return remoteApp.preferencesUrl
    ? {
        ...homeConfig,
        app_preferences: {
          url: remoteApp.preferencesUrl,
        },
      }
    : {...homeConfig}
}

function addRemoteAppProxyConfig(remoteApp: OrganizationApp) {
  return remoteApp.appProxy?.url
    ? {
        app_proxy: {
          url: remoteApp.appProxy.url,
          subpath: remoteApp.appProxy.subPath,
          prefix: remoteApp.appProxy.subPathPrefix,
        },
      }
    : {}
}

function addRemoteAppWebhooksConfig(remoteApp: OrganizationApp) {
  const hasAnyPrivacyWebhook =
    remoteApp.gdprWebhooks?.customerDataRequestUrl ||
    remoteApp.gdprWebhooks?.customerDeletionUrl ||
    remoteApp.gdprWebhooks?.shopDeletionUrl

  const privacyComplianceContent = {
    privacy_compliance: {
      customer_data_request_url: remoteApp.gdprWebhooks?.customerDataRequestUrl,
      customer_deletion_url: remoteApp.gdprWebhooks?.customerDeletionUrl,
      shop_deletion_url: remoteApp.gdprWebhooks?.shopDeletionUrl,
    },
  }

  return {
    webhooks: {
      api_version: remoteApp.webhookApiVersion || '2023-07',
      ...(hasAnyPrivacyWebhook ? privacyComplianceContent : {}),
    },
  }
}

function addRemoteAppAccessConfig(appConfiguration: CurrentAppConfiguration, remoteApp: OrganizationApp) {
  let accessScopesContent = {}
  // if we have upstream scopes, use them
  if (remoteApp.requestedAccessScopes) {
    accessScopesContent = {
      scopes: remoteApp.requestedAccessScopes.join(','),
    }
    // if we can't find scopes or have to fall back, omit setting a scope and set legacy to true
  } else if (getAppScopes(appConfiguration) === '') {
    accessScopesContent = {
      use_legacy_install_flow: true,
    }
    // if we have scopes locally and not upstream, preserve them but don't push them upstream (legacy is true)
  } else {
    accessScopesContent = {
      scopes: getAppScopes(appConfiguration),
      use_legacy_install_flow: true,
    }
  }
  return {
    auth: {
      redirect_urls: remoteApp.redirectUrlWhitelist,
    },
    access_scopes: accessScopesContent,
  }
}

function addLocalAppConfig(appConfiguration: CurrentAppConfiguration, remoteApp: OrganizationApp) {
  let localAppConfig = {
    ...appConfiguration,
    client_id: remoteApp.apiKey,
  }
  delete localAppConfig.auth
  const build = {
    ...(remoteApp.newApp ? {include_config_on_deploy: true} : {}),
    ...(appConfiguration.client_id === remoteApp.apiKey ? localAppConfig.build : {}),
  }
  if (isEmpty(build)) {
    delete localAppConfig.build
  } else {
    localAppConfig = {
      ...localAppConfig,
      build,
    }
  }

  return localAppConfig
}

function addPosConfig(remoteApp: OrganizationApp) {
  return {
    pos: {
      embedded: remoteApp.posEmbedded || false,
    },
  }
}

function addBrandingConfig(remoteApp: OrganizationApp) {
  return {
    name: remoteApp.title,
  }
}

function renderSuccessMessage(configFileName: string, remoteApp: OrganizationApp, localApp: AppInterface) {
  renderSuccess({
    headline: `${configFileName} is now linked to "${remoteApp.title}" on Shopify`,
    body: `Using ${configFileName} as your default config.`,
    nextSteps: [
      [`Make updates to ${configFileName} in your local project`],
      [
        'To upload your config, run',
        {
          command: formatPackageManagerCommand(localApp.packageManager, 'shopify app deploy'),
        },
      ],
    ],
    reference: [
      {
        link: {
          label: 'App configuration',
          url: 'https://shopify.dev/docs/apps/tools/cli/configuration',
        },
      },
    ],
  })
}
