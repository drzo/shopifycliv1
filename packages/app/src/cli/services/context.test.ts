import {
  fetchAppExtensionRegistrations,
  fetchAppFromApiKey,
  fetchOrgAndApps,
  fetchOrganizations,
  fetchOrgFromId,
  fetchStoreByDomain,
} from './dev/fetch.js'
import {selectOrCreateApp} from './dev/select-app.js'
import {selectStore, convertToTestStoreIfNeeded} from './dev/select-store.js'
import {ensureDeploymentIdsPresence} from './context/identifiers.js'
import {
  DevContextOptions,
  ensureDevContext,
  ensureDeployContext,
  ensureThemeExtensionDevContext,
  ensureGenerateContext,
  DeployContextOptions,
  ensureReleaseContext,
} from './context.js'
import {createExtension} from './dev/create-extension.js'
import {CachedAppInfo, clearAppInfo, getAppInfo, setAppInfo} from './local-storage.js'
import {resolveDeploymentMode} from './deploy/mode.js'
import {Organization, OrganizationApp, OrganizationStore} from '../models/organization.js'
import {updateAppIdentifiers, getAppIdentifiers} from '../models/app/identifiers.js'
import {reuseDevConfigPrompt, selectOrganizationPrompt} from '../prompts/dev.js'
import {testApp, testOrganizationApp, testThemeExtensions} from '../models/app/app.test-data.js'
import metadata from '../metadata.js'
import {load, loadAppName} from '../models/app/loader.js'
import {AppInterface} from '../models/app/app.js'
import {DevelopmentStorePreviewUpdateQuery} from '../api/graphql/development_preview.js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {ensureAuthenticatedPartners} from '@shopify/cli-kit/node/session'
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output'
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager'
import {inTemporaryDirectory, readFile, writeFileSync} from '@shopify/cli-kit/node/fs'
import {joinPath} from '@shopify/cli-kit/node/path'
import {renderInfo, renderTasks, Task} from '@shopify/cli-kit/node/ui'
import {partnersRequest} from '@shopify/cli-kit/node/api/partners'
import {AbortError} from '@shopify/cli-kit/node/error'

vi.mock('./local-storage.js')
vi.mock('./dev/fetch')
vi.mock('./dev/create-extension')
vi.mock('./dev/select-app')
vi.mock('./dev/select-store')
vi.mock('../prompts/dev')
vi.mock('../models/app/identifiers')
vi.mock('./context/identifiers')
vi.mock('../models/app/loader.js')
vi.mock('@shopify/cli-kit/node/session')
vi.mock('@shopify/cli-kit/node/node-package-manager.js')
vi.mock('@shopify/cli-kit/node/ui')
vi.mock('./deploy/mode.js')
vi.mock('@shopify/cli-kit/node/api/partners')

beforeEach(() => {
  vi.mocked(ensureAuthenticatedPartners).mockResolvedValue('token')

  // this is needed because using importActual to mock the ui module
  // creates a circular dependency between ui and context/local
  // so we need to mock the whole module and just replace the functions we use
  vi.mocked(renderTasks).mockImplementation(async (tasks: Task[]) => {
    for (const task of tasks) {
      // eslint-disable-next-line no-await-in-loop
      await task.task({}, task)
    }
  })
  vi.mocked(resolveDeploymentMode).mockResolvedValue('legacy')
})

afterEach(() => {
  mockAndCaptureOutput().clear()
})

const APP1: OrganizationApp = testOrganizationApp({
  id: '1',
  title: 'app1',
  apiKey: 'key1',
  apiSecretKeys: [{secret: 'secret1'}],
})
const APP2 = testOrganizationApp({
  id: '2',
  title: 'app2',
  apiKey: 'key2',
  apiSecretKeys: [{secret: 'secret2'}],
  betas: {
    unifiedAppDeployment: false,
  },
})

const APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA: OrganizationApp = {
  ...APP2,
  betas: {
    unifiedAppDeployment: true,
  },
}

const ORG1: Organization = {
  id: '1',
  businessName: 'org1',
  betas: {cliTunnelAlternative: false},
  website: '',
}
const ORG2: Organization = {
  id: '2',
  businessName: 'org2',
  betas: {cliTunnelAlternative: true},
  website: '',
}

const CACHED1: CachedAppInfo = {appId: 'key1', orgId: '1', storeFqdn: 'domain1', directory: '/cached'}
const CACHED1_WITH_CONFIG: CachedAppInfo = {...CACHED1, configFile: 'shopify.app.toml'}
const STORE1: OrganizationStore = {
  shopId: '1',
  link: 'link1',
  shopDomain: 'domain1',
  shopName: 'store1',
  transferDisabled: true,
  convertableToPartnerTest: true,
}
const STORE2: OrganizationStore = {
  shopId: '2',
  link: 'link2',
  shopDomain: 'domain2',
  shopName: 'store2',
  transferDisabled: false,
  convertableToPartnerTest: false,
}

const INPUT: DevContextOptions = {
  directory: 'app_directory',
  reset: false,
}

const INPUT_WITH_DATA: DevContextOptions = {
  directory: 'app_directory',
  reset: false,
  apiKey: 'key1',
  storeFqdn: 'domain1',
}

const BAD_INPUT_WITH_DATA: DevContextOptions = {
  directory: 'app_directory',
  reset: false,
  apiKey: 'key1',
  storeFqdn: 'invalid_store_domain',
}

const FETCH_RESPONSE = {
  organization: ORG1,
  apps: {nodes: [APP1, APP2], pageInfo: {hasNextPage: false}},
  stores: [STORE1, STORE2],
}

const options = (app: AppInterface): DeployContextOptions => {
  return {
    app,
    reset: false,
    force: false,
    noRelease: false,
  }
}

beforeEach(async () => {
  vi.mocked(getAppIdentifiers).mockReturnValue({app: undefined})
  vi.mocked(selectOrganizationPrompt).mockResolvedValue(ORG1)
  vi.mocked(selectOrCreateApp).mockResolvedValue(APP1)
  vi.mocked(selectStore).mockResolvedValue(STORE1)
  vi.mocked(fetchOrganizations).mockResolvedValue([ORG1, ORG2])
  vi.mocked(fetchOrgFromId).mockResolvedValue(ORG1)
  vi.mocked(fetchOrgAndApps).mockResolvedValue(FETCH_RESPONSE)
  vi.mocked(getPackageManager).mockResolvedValue('npm')
})

describe('ensureGenerateContext', () => {
  test('returns the provided app apiKey if valid, without cached state', async () => {
    // Given
    const input = {apiKey: 'key2', directory: '/app', reset: false, token: 'token'}
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)

    // When
    const got = await ensureGenerateContext(input)

    // Then
    expect(got).toEqual(APP2.apiKey)
  })
  test('returns the cached api key', async () => {
    // Given
    const input = {directory: '/app', reset: false, token: 'token'}
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(getAppInfo).mockReturnValue(CACHED1)

    // When
    const got = await ensureGenerateContext(input)

    // Then
    expect(got).toEqual(APP2.apiKey)
  })
  test('selects a new app and returns the api key', async () => {
    // Given
    const input = {directory: '/app', reset: true, token: 'token'}
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(loadAppName).mockResolvedValueOnce('my-app')
    vi.mocked(getAppInfo).mockReturnValue(undefined)

    // When
    const got = await ensureGenerateContext(input)

    // Then
    expect(got).toEqual(APP1.apiKey)
    expect(selectOrCreateApp).toHaveBeenCalledWith(
      'my-app',
      {nodes: [APP1, APP2], pageInfo: {hasNextPage: false}},
      ORG1,
      'token',
    )
    expect(setAppInfo).toHaveBeenCalledWith({
      appId: APP1.apiKey,
      title: APP1.title,
      directory: '/app',
      orgId: ORG1.id,
    })
  })
})

describe('ensureDevContext', async () => {
  beforeEach(() => {
    vi.mocked(load).mockResolvedValueOnce(testApp())
  })

  test('returns selected data using config file set in cache', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      vi.mocked(getAppInfo).mockReturnValue(CACHED1_WITH_CONFIG)
      vi.mocked(load).mockReset()
      vi.mocked(load).mockResolvedValue(
        testApp({
          configurationPath: joinPath(tmp, CACHED1_WITH_CONFIG.configFile!),
          configuration: {
            client_id: APP2.apiKey,
            name: APP2.title,
            scopes: 'read_products',
            application_url: 'https://my-apps-url.com',
            auth: {
              redirect_urls: ['https://my-apps-url.com/auth/shopify'],
            },
            cli: {
              automatically_update_urls_on_dev: true,
              dev_store_url: STORE1.shopDomain,
            },
          },
        }),
      )
      vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
      vi.mocked(fetchStoreByDomain).mockResolvedValue({organization: ORG1, store: STORE1})

      // When
      const got = await ensureDevContext(
        {
          directory: 'app_directory',
          reset: false,
        },
        'token',
      )

      // Then
      expect(got).toEqual({
        remoteApp: {...APP2, apiSecret: 'secret2'},
        storeFqdn: STORE1.shopDomain,
        remoteAppUpdated: false,
        useCloudflareTunnels: true,
        updateURLs: true,
        config: CACHED1_WITH_CONFIG.configFile,
        deploymentMode: 'legacy',
      })
      expect(setAppInfo).not.toHaveBeenCalled()

      expect(metadata.getAllPublicMetadata()).toMatchObject({
        api_key: APP2.apiKey,
        partner_id: 1,
      })
    })
  })

  test('loads the correct file when config flag is passed in', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      vi.mocked(getAppInfo).mockReturnValue(undefined)
      vi.mocked(load).mockReset()
      vi.mocked(load).mockResolvedValue(
        testApp({
          configurationPath: joinPath(tmp, 'shopify.app.dev.toml'),
          configuration: {
            client_id: APP2.apiKey,
            name: APP2.title,
            scopes: 'read_products',
            application_url: 'https://my-apps-url.com',
            auth: {
              redirect_urls: ['https://my-apps-url.com/auth/shopify'],
            },
            cli: {
              automatically_update_urls_on_dev: true,
              dev_store_url: STORE1.shopDomain,
            },
          },
        }),
      )
      vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
      vi.mocked(fetchStoreByDomain).mockResolvedValue({organization: ORG1, store: STORE1})

      // When
      await ensureDevContext(
        {
          directory: 'app_directory',
          reset: false,
          config: 'dev',
        },
        'token',
      )

      // Then
      expect(load).toHaveBeenCalledWith({
        directory: 'app_directory',
        specifications: [],
        configName: 'dev',
      })
    })
  })

  test('prompts to select store & update urls when not set in config file', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      const filePath = joinPath(tmp, 'shopify.app.dev.toml')
      writeFileSync(filePath, '')
      vi.mocked(load).mockReset()
      vi.mocked(load).mockResolvedValue(
        testApp({
          configurationPath: filePath,
          configuration: {
            client_id: APP2.apiKey,
            name: APP2.title,
            scopes: 'read_products',
            application_url: 'https://my-apps-url.com',
            auth: {
              redirect_urls: ['https://my-apps-url.com/auth/shopify'],
            },
            cli: {
              automatically_update_urls_on_dev: true,
            },
          },
        }),
      )
      vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)

      // When
      await ensureDevContext(
        {
          directory: 'app_directory',
          reset: false,
          config: 'dev',
        },
        'token',
      )

      // Then
      expect(selectStore).toHaveBeenCalled()
      const content = await readFile(joinPath(tmp, 'shopify.app.dev.toml'))
      const expectedContent = `client_id = "key2"
name = "app2"
scopes = "read_products"
application_url = "https://my-apps-url.com"

[auth]
redirect_urls = [ "https://my-apps-url.com/auth/shopify" ]

[cli]
automatically_update_urls_on_dev = true
dev_store_url = "domain1"
`
      expect(content).toEqual(expectedContent)
    })
  })

  test('returns selected data and updates internal state, without cached state', async () => {
    // Given
    vi.mocked(getAppInfo).mockReturnValue(undefined)

    // When
    const got = await ensureDevContext(INPUT, 'token')

    // Then
    expect(got).toEqual({
      remoteApp: {...APP1, apiSecret: 'secret1'},
      storeFqdn: STORE1.shopDomain,
      remoteAppUpdated: true,
      useCloudflareTunnels: true,
      updateURLs: undefined,
      deploymentMode: 'legacy',
    })
    expect(setAppInfo).toHaveBeenNthCalledWith(1, {
      appId: APP1.apiKey,
      title: APP1.title,
      storeFqdn: STORE1.shopDomain,
      directory: INPUT.directory,
      orgId: ORG1.id,
    })

    expect(metadata.getAllPublicMetadata()).toMatchObject({
      api_key: APP1.apiKey,
      partner_id: 1,
    })
  })

  test('returns useCloudflareTunnels false if the beta is enabled in partners', async () => {
    // Given
    vi.mocked(getAppInfo).mockReturnValue(undefined)
    vi.mocked(fetchOrgFromId).mockResolvedValueOnce(ORG2)

    // When
    const got = await ensureDevContext(INPUT, 'token')

    // Then
    expect(got).toEqual({
      remoteApp: {...APP1, apiSecret: 'secret1'},
      storeFqdn: STORE1.shopDomain,
      remoteAppUpdated: true,
      useCloudflareTunnels: false,
      updateURLs: undefined,
      deploymentMode: 'legacy',
    })
  })

  test('returns selected data and updates internal state, with cached state', async () => {
    // Given
    const outputMock = mockAndCaptureOutput()
    vi.mocked(getAppInfo).mockReturnValue(CACHED1)
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP1)
    vi.mocked(fetchStoreByDomain).mockResolvedValue({organization: ORG1, store: STORE1})

    // When
    const got = await ensureDevContext(INPUT, 'token')

    // Then
    expect(got).toEqual({
      remoteApp: {...APP1, apiSecret: 'secret1'},
      storeFqdn: STORE1.shopDomain,
      remoteAppUpdated: false,
      useCloudflareTunnels: true,
      updateURLs: undefined,
      deploymentMode: 'legacy',
    })
    expect(fetchOrganizations).not.toBeCalled()
    expect(selectOrganizationPrompt).not.toBeCalled()
    expect(setAppInfo).toHaveBeenNthCalledWith(1, {
      appId: APP1.apiKey,
      title: APP1.title,
      storeFqdn: STORE1.shopDomain,
      directory: INPUT.directory,
      orgId: ORG1.id,
    })
    expect(renderInfo).toHaveBeenCalledWith({
      body: [
        {
          list: {
            items: [
              'Org:          org1',
              'App:          undefined',
              'Dev store:    domain1',
              'Update URLs:  Not yet configured',
            ],
          },
        },
        '\nTo reset your default dev config, run',
        {
          command: 'npm run dev -- --reset',
        },
      ],
      headline: 'Using these settings:',
    })
    expect(fetchOrgAndApps).not.toBeCalled()
  })

  test('returns selected data and updates internal state, with inputs from flags', async () => {
    // Given
    vi.mocked(getAppInfo).mockReturnValue(undefined)
    vi.mocked(convertToTestStoreIfNeeded).mockResolvedValueOnce()
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(fetchStoreByDomain).mockResolvedValue({organization: ORG1, store: STORE1})

    // When
    const got = await ensureDevContext(INPUT_WITH_DATA, 'token')

    // Then
    expect(got).toEqual({
      remoteApp: {...APP2, apiSecret: 'secret2'},
      storeFqdn: STORE1.shopDomain,
      remoteAppUpdated: true,
      useCloudflareTunnels: true,
      updateURLs: undefined,
      deploymentMode: 'legacy',
    })
    expect(setAppInfo).toHaveBeenNthCalledWith(1, {
      appId: APP2.apiKey,
      directory: INPUT_WITH_DATA.directory,
      storeFqdn: STORE1.shopDomain,
      orgId: ORG1.id,
      title: APP2.title,
    })
    expect(fetchOrganizations).toBeCalled()
    expect(selectOrganizationPrompt).toBeCalled()
    expect(selectOrCreateApp).not.toBeCalled()
    expect(selectStore).not.toBeCalled()
    expect(fetchOrgAndApps).not.toBeCalled()
  })

  test('throws if the store input is not valid', async () => {
    // Given
    vi.mocked(getAppInfo).mockReturnValue(undefined)
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(fetchStoreByDomain).mockResolvedValue({organization: ORG1, store: undefined})

    // When
    const got = ensureDevContext(BAD_INPUT_WITH_DATA, 'token')

    await expect(got).rejects.toThrow(/Could not find invalid_store_domain/)
  })

  test('resets cached state if reset is true', async () => {
    // When
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    await ensureDevContext({...INPUT, reset: true}, 'token')

    // Then
    expect(clearAppInfo).toHaveBeenCalledWith(BAD_INPUT_WITH_DATA.directory)
    expect(fetchOrgAndApps).toBeCalled()
  })

  test('dev enables automatically the development store preview if the unified deployments beta is enabled', async () => {
    // Given
    vi.mocked(getAppInfo).mockReturnValue(undefined)
    vi.mocked(fetchOrgFromId).mockResolvedValueOnce(ORG2)
    vi.mocked(selectOrCreateApp).mockResolvedValue(APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA)
    vi.mocked(partnersRequest).mockResolvedValueOnce({
      developmentStorePreviewUpdate: {app: {developmentStorePreviewEnabled: true}},
    })
    const mockOutput = mockAndCaptureOutput()

    // When
    const got = await ensureDevContext(INPUT, 'token')

    // Then
    expect(got).toEqual({
      remoteApp: {...APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA, apiSecret: 'secret2'},
      storeFqdn: STORE1.shopDomain,
      remoteAppUpdated: true,
      useCloudflareTunnels: false,
      updateURLs: undefined,
      deploymentMode: 'unified',
    })
    expect(partnersRequest).toHaveBeenCalledWith(DevelopmentStorePreviewUpdateQuery, 'token', {
      input: {apiKey: 'key2', enabled: true},
    })
    expect(mockOutput.completed()).toMatchInlineSnapshot('"Development store preview enabled"')
  })

  test('display an error to enable dev preview if the beta is enabled in partners but an error is returned', async () => {
    // Given
    vi.mocked(getAppInfo).mockReturnValue(undefined)
    vi.mocked(fetchOrgFromId).mockResolvedValueOnce(ORG2)
    vi.mocked(selectOrCreateApp).mockResolvedValue(APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA)
    vi.mocked(partnersRequest).mockRejectedValue(new AbortError('error enabling'))
    const mockOutput = mockAndCaptureOutput()

    // When
    const got = await ensureDevContext(INPUT, 'token')

    // Then
    expect(got).toEqual({
      remoteApp: {...APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA, apiSecret: 'secret2'},
      storeFqdn: STORE1.shopDomain,
      remoteAppUpdated: true,
      useCloudflareTunnels: false,
      updateURLs: undefined,
      deploymentMode: 'unified',
    })
    expect(partnersRequest).toHaveBeenCalledWith(DevelopmentStorePreviewUpdateQuery, 'token', {
      input: {apiKey: 'key2', enabled: true},
    })
    expect(mockOutput.warn()).toMatchInlineSnapshot(
      '"Unable to enable development store preview for this app. You can change this setting in the Partner Dashboard ( https://partners.shopify.com/1/apps/2/extensions ).\'}"',
    )
  })
})

describe('ensureDeployContext', () => {
  test("fetches the app from the partners' API and returns it alongside the id when identifiers are available locally and the app has no extensions", async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP2.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP2.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)

    // When
    const got = await ensureDeployContext(options(app))

    // Then
    expect(selectOrCreateApp).not.toHaveBeenCalled()
    expect(got.partnersApp.id).toEqual(APP2.id)
    expect(got.partnersApp.title).toEqual(APP2.title)
    expect(got.partnersApp.appType).toEqual(APP2.appType)
    expect(got.identifiers).toEqual(identifiers)
    expect(got.deploymentMode).toEqual('legacy')

    expect(metadata.getAllPublicMetadata()).toMatchObject({api_key: APP2.apiKey, partner_id: 1})
  })

  test("fetches the app from the partners' API and returns it alongside the id when there are no identifiers but user chooses to reuse dev store.cliKitStore()", async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP2.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockReturnValue({app: undefined})
    vi.mocked(getAppInfo).mockReturnValue(CACHED1)
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)
    vi.mocked(reuseDevConfigPrompt).mockResolvedValueOnce(true)

    // When
    const got = await ensureDeployContext(options(app))

    // Then
    expect(selectOrCreateApp).not.toHaveBeenCalled()
    expect(reuseDevConfigPrompt).toHaveBeenCalled()
    expect(got.partnersApp.id).toEqual(APP2.id)
    expect(got.partnersApp.title).toEqual(APP2.title)
    expect(got.partnersApp.appType).toEqual(APP2.appType)
    expect(got.identifiers).toEqual(identifiers)
    expect(got.deploymentMode).toEqual('legacy')
  })

  test('prompts the user to create or select an app and returns it with its id when the app has no extensions', async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP1.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockReturnValue({app: undefined})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)
    // When
    const got = await ensureDeployContext(options(app))

    // Then
    expect(fetchOrganizations).toHaveBeenCalledWith('token')
    expect(selectOrCreateApp).toHaveBeenCalledWith(
      app.name,
      {nodes: [APP1, APP2], pageInfo: {hasNextPage: false}},
      ORG1,
      'token',
    )
    expect(updateAppIdentifiers).toBeCalledWith({
      app,
      identifiers,
      command: 'deploy',
    })
    expect(got.partnersApp.id).toEqual(APP1.id)
    expect(got.partnersApp.title).toEqual(APP1.title)
    expect(got.partnersApp.appType).toEqual(APP1.appType)
    expect(got.identifiers).toEqual({app: APP1.apiKey, extensions: {}, extensionIds: {}})
    expect(got.deploymentMode).toEqual('legacy')
  })

  test("throws an app not found error if the app with the Client ID doesn't exist", async () => {
    // Given
    const app = testApp()
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP1.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(undefined)

    // When
    await expect(ensureDeployContext(options(app))).rejects.toThrow(/Couldn't find the app with Client ID key1/)
  })

  test('prompts the user to create or select an app if reset is true', async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP1.apiKey,
      extensions: {},
      extensionIds: {},
    }

    // There is a cached app but it will be ignored
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP2.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)

    const opts = options(app)
    opts.reset = true

    // When
    const got = await ensureDeployContext(opts)

    // Then
    expect(fetchOrganizations).toHaveBeenCalledWith('token')
    expect(selectOrCreateApp).toHaveBeenCalledWith(
      app.name,
      {nodes: [APP1, APP2], pageInfo: {hasNextPage: false}},
      ORG1,
      'token',
    )
    expect(updateAppIdentifiers).toBeCalledWith({
      app,
      identifiers,
      command: 'deploy',
    })
    expect(got.partnersApp.id).toEqual(APP1.id)
    expect(got.partnersApp.title).toEqual(APP1.title)
    expect(got.partnersApp.appType).toEqual(APP1.appType)
    expect(got.identifiers).toEqual({app: APP1.apiKey, extensions: {}, extensionIds: {}})
    expect(got.deploymentMode).toEqual('legacy')
  })

  test('throws an error using legacy deployments and source control url flag', async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP1.apiKey,
      extensions: {},
      extensionIds: {},
    }

    // There is a cached app but it will be ignored
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP2.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)

    const opts = options(app)
    opts.reset = true
    opts.commitReference = 'https://github.com/deploytest/repo/commit/d4e5ce7999242b200acde378654d62c14b211bcc'

    // When/ Then
    await expect(ensureDeployContext(opts)).rejects.toThrowErrorMatchingInlineSnapshot(
      '"The `source-control-url` flag is not supported for this app."',
    )

    expect(fetchOrganizations).toHaveBeenCalledWith('token')
    expect(selectOrCreateApp).toHaveBeenCalledWith(
      app.name,
      {nodes: [APP1, APP2], pageInfo: {hasNextPage: false}},
      ORG1,
      'token',
    )
  })

  test('deploy disables automatically the development store preview if the unified deployments beta is enabled', async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP2.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP2.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)
    vi.mocked(partnersRequest).mockResolvedValueOnce({
      developmentStorePreviewUpdate: {app: {developmentStorePreviewEnabled: false}},
    })
    const mockOutput = mockAndCaptureOutput()

    // When
    const got = await ensureDeployContext(options(app))

    // Then
    expect(selectOrCreateApp).not.toHaveBeenCalled()
    expect(got.partnersApp.id).toEqual(APP2.id)
    expect(got.partnersApp.title).toEqual(APP2.title)
    expect(got.partnersApp.appType).toEqual(APP2.appType)
    expect(got.identifiers).toEqual(identifiers)
    expect(got.deploymentMode).toEqual('legacy')

    expect(metadata.getAllPublicMetadata()).toMatchObject({api_key: APP2.apiKey, partner_id: 1})
    expect(partnersRequest).toHaveBeenCalledWith(DevelopmentStorePreviewUpdateQuery, 'token', {
      input: {apiKey: 'key2', enabled: false},
    })
    expect(mockOutput.completed()).toMatchInlineSnapshot('"Development store preview disabled"')
  })

  test('display an error to disable dev preview if the beta is enabled in partners but an error is returned', async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP2.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP2.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)
    vi.mocked(partnersRequest).mockRejectedValue(new AbortError('error disabling'))
    const mockOutput = mockAndCaptureOutput()

    // When
    const got = await ensureDeployContext(options(app))

    // Then
    expect(selectOrCreateApp).not.toHaveBeenCalled()
    expect(got.partnersApp.id).toEqual(APP2.id)
    expect(got.partnersApp.title).toEqual(APP2.title)
    expect(got.partnersApp.appType).toEqual(APP2.appType)
    expect(got.identifiers).toEqual(identifiers)
    expect(got.deploymentMode).toEqual('legacy')

    expect(metadata.getAllPublicMetadata()).toMatchObject({api_key: APP2.apiKey, partner_id: 1})
    expect(partnersRequest).toHaveBeenCalledWith(DevelopmentStorePreviewUpdateQuery, 'token', {
      input: {apiKey: 'key2', enabled: false},
    })
    expect(mockOutput.warn()).toMatchInlineSnapshot(
      '"Unable to disable development store preview for this app. You can change this setting in the Partner Dashboard ( https://partners.shopify.com/1/apps/2/extensions ).\'}"',
    )
  })
})

describe('ensureReleaseContext', () => {
  test('throws an error if the beta flag is turned off', async () => {
    // Given
    const app = testApp()
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP1.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP1)

    // Then
    await expect(() =>
      ensureReleaseContext({
        app,
        apiKey: 'key1',
        reset: false,
        force: false,
      }),
    ).rejects.toThrowError('')
  })

  test('updates app identifiers if the beta flag is turned on', async () => {
    // Given
    const app = testApp()
    vi.mocked(getAppIdentifiers).mockReturnValue({app: APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA)
    vi.mocked(updateAppIdentifiers).mockResolvedValue(app)

    // When
    const got = await ensureReleaseContext({
      app,
      apiKey: 'key2',
      reset: false,
      force: false,
    })

    // Then
    expect(updateAppIdentifiers).toBeCalledWith({
      app,
      identifiers: {
        app: APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA.apiKey,
      },
      command: 'release',
    })
    expect(got.app).toEqual(app)
    expect(got.apiKey).toEqual(APP_WITH_UNIFIED_APP_DEPLOYMENTS_BETA.apiKey)
    expect(got.token).toEqual('token')
  })
})

describe('ensureThemeExtensionDevContext', () => {
  test('fetches theme extension when it exists', async () => {
    // Given
    const token = 'token'
    const apiKey = 'apiKey'
    const extension = await testThemeExtensions()

    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValue({
      app: {
        extensionRegistrations: [
          {
            id: 'other ID',
            uuid: 'other UUID',
            title: 'other extension',
            type: 'other',
          },
          {
            id: 'existing ID',
            uuid: 'UUID',
            title: 'theme app extension',
            type: 'THEME_APP_EXTENSION',
          },
        ],
        dashboardManagedExtensionRegistrations: [],
        functions: [],
      },
    })

    // When
    const got = await ensureThemeExtensionDevContext(extension, apiKey, token)

    // Then
    expect('existing ID').toEqual(got.id)
    expect('UUID').toEqual(got.uuid)
    expect('theme app extension').toEqual(got.title)
    expect('THEME_APP_EXTENSION').toEqual(got.type)
  })

  test('creates theme extension when it does not exist', async () => {
    // Given
    const token = 'token'
    const apiKey = 'apiKey'
    const extension = await testThemeExtensions()

    vi.mocked(fetchAppExtensionRegistrations).mockResolvedValue({
      app: {extensionRegistrations: [], dashboardManagedExtensionRegistrations: [], functions: []},
    })
    vi.mocked(createExtension).mockResolvedValue({
      id: 'new ID',
      uuid: 'UUID',
      title: 'theme app extension',
      type: 'THEME_APP_EXTENSION',
    })

    // When
    const got = await ensureThemeExtensionDevContext(extension, apiKey, token)

    // Then
    expect('new ID').toEqual(got.id)
    expect('UUID').toEqual(got.uuid)
    expect('theme app extension').toEqual(got.title)
    expect('THEME_APP_EXTENSION').toEqual(got.type)
  })
})
