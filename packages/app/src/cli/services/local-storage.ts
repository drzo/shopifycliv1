import {LocalStorage} from '@shopify/cli-kit/node/local-storage'
import {outputDebug, outputContent, outputToken} from '@shopify/cli-kit/node/output'
import {normalizePath} from '@shopify/cli-kit/node/path'

export interface CachedAppInfo {
  directory: string
  appEnv: string
  appId?: string
  title?: string
  orgId?: string
  storeFqdn?: string
  updateURLs?: boolean
  tunnelPlugin?: string
}

export interface CachedOrganization {
  directory: string
  orgId?: string
}

export interface CurrentToml {
  directory: string
  toml?: string
}

// We store each app info using the directory as the key
export interface AppLocalStorageSchema {
  [key: string]: CachedAppInfo
}

export interface OrganizationLocalStorageSchema {
  [key: string]: CachedOrganization
}

export interface CurrentTomlLocalStorageSchema {
  [key: string]: CurrentToml
}

let _instance: LocalStorage<AppLocalStorageSchema> | undefined
let _orgInstance: LocalStorage<OrganizationLocalStorageSchema> | undefined
let _currentTomlInstance: LocalStorage<CurrentTomlLocalStorageSchema> | undefined

function appLocalStorage() {
  if (!_instance) {
    _instance = new LocalStorage<AppLocalStorageSchema>({projectName: 'shopify-cli-app'})
  }
  return _instance
}

function organizationLocalStorage() {
  if (!_orgInstance) {
    _orgInstance = new LocalStorage<OrganizationLocalStorageSchema>({projectName: 'shopify-cli-app-org'})
  }
  return _orgInstance
}

function currentTomlLocalStorage() {
  if (!_currentTomlInstance) {
    _currentTomlInstance = new LocalStorage<CurrentTomlLocalStorageSchema>({
      projectName: 'shopify-cli-app-current-toml',
    })
  }
  return _currentTomlInstance
}

export function getAppInfo(
  directory: string,
  appEnv = '',
  config: LocalStorage<AppLocalStorageSchema> = appLocalStorage(),
): CachedAppInfo | undefined {
  const normalized = normalizePath(`${directory}-${appEnv}`)
  outputDebug(outputContent`Reading cached app information for directory ${outputToken.path(normalized)}...`)
  return config.get(normalized)
}

export function getOrganization(
  directory: string,
  config: LocalStorage<OrganizationLocalStorageSchema> = organizationLocalStorage(),
) {
  const normalized = normalizePath(directory)
  return config.get(normalized)
}

export function getCurrentToml(
  directory: string,
  config: LocalStorage<CurrentTomlLocalStorageSchema> = currentTomlLocalStorage(),
) {
  const normalized = normalizePath(directory)
  return config.get(normalized)
}

export function clearAppInfo(
  directory: string,
  appEnv = '',
  config: LocalStorage<AppLocalStorageSchema> = appLocalStorage(),
): void {
  const normalized = normalizePath(`${directory}-${appEnv}`)
  outputDebug(outputContent`Clearing app information for directory ${outputToken.path(normalized)}...`)
  config.delete(normalized)
}

export function clearAllInfo(
  directory: string,
  appEnv = '',
  appConfig: LocalStorage<AppLocalStorageSchema> = appLocalStorage(),
  orgConfig: LocalStorage<OrganizationLocalStorageSchema> = organizationLocalStorage(),
  tomlConfig: LocalStorage<CurrentTomlLocalStorageSchema> = currentTomlLocalStorage(),
): void {
  const normalized = normalizePath(directory)
  const normalizedWithEnv = normalizePath(`${directory}-${appEnv}`)
  outputDebug(outputContent`Clearing app information for directory ${outputToken.path(normalizedWithEnv)}...`)
  appConfig.delete(normalizedWithEnv)
  orgConfig.delete(normalized)
  tomlConfig.delete(normalized)
}

export function clearAllAppInfo(config: LocalStorage<AppLocalStorageSchema> = appLocalStorage()): void {
  outputDebug(outputContent`Clearing all app information...`)
  config.clear()
}

export function setAppInfo(
  options: CachedAppInfo,
  config: LocalStorage<AppLocalStorageSchema> = appLocalStorage(),
): void {
  const normalizedDirectory = normalizePath(options.directory)
  const normalized = normalizePath(`${options.directory}-${options.appEnv}`)
  outputDebug(
    outputContent`Storing app information for directory ${outputToken.path(normalized)}:${outputToken.json(options)}`,
  )
  const savedApp = config.get(normalized)
  if (savedApp) {
    config.set(normalized, {
      directory: normalizedDirectory,
      appEnv: options.appEnv,
      appId: options.appId ?? savedApp.appId,
      title: options.title ?? savedApp.title,
      storeFqdn: options.storeFqdn ?? savedApp.storeFqdn,
      orgId: options.orgId ?? savedApp.orgId,
      updateURLs: options.updateURLs ?? savedApp.updateURLs,
      tunnelPlugin: options.tunnelPlugin ?? savedApp.tunnelPlugin,
    })
  } else {
    config.set(normalized, options)
  }
}

export function setOrgInfo(
  options: CachedOrganization,
  config: LocalStorage<OrganizationLocalStorageSchema> = organizationLocalStorage(),
) {
  const normalized = normalizePath(options.directory)
  config.set(normalized, options)
}

export function setCurrentToml(
  options: CurrentToml,
  config: LocalStorage<CurrentTomlLocalStorageSchema> = currentTomlLocalStorage(),
) {
  const normalized = normalizePath(options.directory)
  config.set(normalized, options)
}
