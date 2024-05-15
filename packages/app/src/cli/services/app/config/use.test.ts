import use, {UseOptions} from './use.js'
import {testApp, testAppWithConfig, testAppWithLegacyConfig} from '../../../models/app/app.test-data.js'
import {getAppConfigurationFileName, loadAppConfiguration} from '../../../models/app/loader.js'
import {clearCurrentConfigFile, getAppInfo, setAppInfo} from '../../local-storage.js'
import {selectConfigFile} from '../../../prompts/config.js'
import {describe, expect, test, vi} from 'vitest'
import {inTemporaryDirectory, writeFileSync} from '@shopify/cli-kit/node/fs'
import {joinPath} from '@shopify/cli-kit/node/path'
import {renderSuccess} from '@shopify/cli-kit/node/ui'
import {err, ok} from '@shopify/cli-kit/node/result'

const LOCAL_APP = testApp()

vi.mock('../../../prompts/config.js')
vi.mock('../../local-storage.js')
vi.mock('../../../models/app/loader.js')
vi.mock('@shopify/cli-kit/node/ui')

describe('use', () => {
  test('clears currentConfiguration when reset is true', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      const options: UseOptions = {
        directory: tmp,
        config: 'invalid',
        reset: true,
      }

      // When
      await use(options)

      // Then
      expect(clearCurrentConfigFile).toHaveBeenCalledWith(tmp)
      expect(setAppInfo).not.toHaveBeenCalled()
      expect(loadAppConfiguration).not.toHaveBeenCalled()

      expect(renderSuccess).toHaveBeenCalledWith({
        headline: 'Cleared current configuration.',
        body: ['In order to set a new current configuration, please run `shopify app config use CONFIG_NAME`.'],
      })
    })
  })

  test('throws an error when config file does not exist', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      const options: UseOptions = {
        directory: tmp,
        config: 'not-there',
      }
      vi.mocked(getAppConfigurationFileName).mockReturnValue('shopify.app.not-there.toml')

      // When
      const result = use(options)

      // Then
      await expect(result).rejects.toThrow(/Could not find configuration file shopify\.app\.not-there\.toml/)
    })
  })

  test('throws an error when config file does not contain client_id', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      createConfigFile(tmp, 'shopify.app.no-id.toml')
      const options: UseOptions = {
        directory: tmp,
        config: 'no-id',
      }
      vi.mocked(getAppConfigurationFileName).mockReturnValue('shopify.app.no-id.toml')

      const appWithoutClientID = testApp()
      vi.mocked(loadAppConfiguration).mockResolvedValue({
        appDirectory: tmp,
        configurationPath: appWithoutClientID.configurationPath,
        configuration: appWithoutClientID.configuration,
      })

      // When
      const result = use(options)

      // Then
      await expect(result).rejects.toThrow(/Configuration file shopify\.app\.no-id\.toml needs a client_id./)
    })
  })

  test("throws error when config file can't be parsed", async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      createConfigFile(tmp, 'shopify.app.invalid.toml')
      const options: UseOptions = {
        directory: tmp,
        config: 'invalid',
      }
      vi.mocked(getAppConfigurationFileName).mockReturnValue('shopify.app.invalid.toml')

      const error = new Error(`Fix a schema error in ${tmp}/shopify.app.invalid.toml:
[
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "string",
    "path": [
      "redirect_url_allowlist"
    ],
    "message": "Expected array, received string"
  }
]'`)
      vi.mocked(loadAppConfiguration).mockRejectedValue(error)

      // When
      const result = use(options)

      // Then
      await expect(result).rejects.toThrow(error)
    })
  })

  test('saves currentConfiguration with client_id and config name to localstorage', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      createConfigFile(tmp, 'shopify.app.staging.toml')
      const options: UseOptions = {
        directory: tmp,
        config: 'staging',
      }
      vi.mocked(getAppConfigurationFileName).mockReturnValue('shopify.app.staging.toml')

      const app = testAppWithLegacyConfig({
        config: {
          name: 'something',
          client_id: 'something',
          api_contact_email: 'bob@bob.com',
          webhook_api_version: '2023-04',
          application_url: 'https://example.com',
        },
      })
      vi.mocked(loadAppConfiguration).mockResolvedValue({
        appDirectory: tmp,
        configurationPath: app.configurationPath,
        configuration: app.configuration,
      })

      // When
      await use(options)

      // Then
      expect(setAppInfo).toHaveBeenCalledWith({
        directory: tmp,
        configFile: 'shopify.app.staging.toml',
        previousAppId: undefined,
      })
      expect(renderSuccess).toHaveBeenCalledWith({
        headline: 'Using configuration file shopify.app.staging.toml',
      })
    })
  })

  test('saves previousAppId when user switches to different config', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      createConfigFile(tmp, 'shopify.app.dev.toml')
      createConfigFile(tmp, 'shopify.app.staging.toml')

      const options: UseOptions = {
        directory: tmp,
        config: 'staging',
      }

      vi.mocked(getAppConfigurationFileName).mockReturnValue('shopify.app.staging.toml')

      const previousApp = testAppWithConfig({
        config: {
          name: 'something old',
          client_id: 'previous-app',
          api_contact_email: 'bob@bob.com',
          webhook_api_version: '2023-04',
          application_url: 'https://example.com',
        },
      })
      const app = testAppWithConfig({
        config: {
          name: 'something new',
          client_id: 'new-app',
          api_contact_email: 'bob@bob.com',
          webhook_api_version: '2023-04',
          application_url: 'https://example.com',
        },
      })

      vi.mocked(getAppInfo).mockReturnValue({directory: tmp, configFile: 'shopify.app.dev.toml'})

      vi.mocked(loadAppConfiguration)
        .mockResolvedValueOnce({
          appDirectory: tmp,
          configurationPath: `${tmp}/shopify.app.staging.toml`,
          configuration: app.configuration,
        })
        .mockResolvedValueOnce({
          appDirectory: tmp,
          configurationPath: `${tmp}/shopify.app.dev.toml`,
          configuration: previousApp.configuration,
        })

      // When
      await use(options)

      // Then
      expect(setAppInfo).toHaveBeenCalledWith({
        directory: tmp,
        configFile: 'shopify.app.staging.toml',
        previousAppId: 'previous-app',
      })
      expect(renderSuccess).toHaveBeenCalledWith({
        headline: 'Using configuration file shopify.app.staging.toml',
      })
    })
  })

  test('sets previousAppId to undefined when previous config file does not exist', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      createConfigFile(tmp, 'shopify.app.staging.toml')

      const options: UseOptions = {
        directory: tmp,
        config: 'staging',
      }

      vi.mocked(getAppConfigurationFileName).mockReturnValue('shopify.app.staging.toml')

      const app = testAppWithConfig({
        config: {
          name: 'something new',
          client_id: 'new-app',
          api_contact_email: 'bob@bob.com',
          webhook_api_version: '2023-04',
          application_url: 'https://example.com',
        },
      })

      vi.mocked(getAppInfo).mockReturnValue({directory: tmp, configFile: 'shopify.app.dev.toml'})

      vi.mocked(loadAppConfiguration).mockResolvedValue({
        appDirectory: tmp,
        configurationPath: `${tmp}/shopify.app.staging.toml`,
        configuration: app.configuration,
      })

      // When
      await use(options)

      // Then
      expect(setAppInfo).toHaveBeenCalledWith({
        directory: tmp,
        configFile: 'shopify.app.staging.toml',
        previousAppId: undefined,
      })
      expect(renderSuccess).toHaveBeenCalledWith({
        headline: 'Using configuration file shopify.app.staging.toml',
      })
    })
  })

  test('sets previousAppId to undefined when previous config file is legacy schema', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      createConfigFile(tmp, 'shopify.app.dev.toml')
      createConfigFile(tmp, 'shopify.app.staging.toml')

      const options: UseOptions = {
        directory: tmp,
        config: 'staging',
      }

      vi.mocked(getAppConfigurationFileName).mockReturnValue('shopify.app.staging.toml')

      const previousApp = testAppWithLegacyConfig({
        config: {
          name: 'something old',
          scopes: 'read_products',
        },
      })
      const app = testAppWithConfig({
        config: {
          name: 'something new',
          client_id: 'new-app',
          api_contact_email: 'bob@bob.com',
          webhook_api_version: '2023-04',
          application_url: 'https://example.com',
        },
      })

      vi.mocked(getAppInfo).mockReturnValue({directory: tmp, configFile: 'shopify.app.dev.toml'})

      vi.mocked(loadAppConfiguration)
        .mockResolvedValueOnce({
          appDirectory: tmp,
          configurationPath: `${tmp}/shopify.app.staging.toml`,
          configuration: app.configuration,
        })
        .mockResolvedValueOnce({
          appDirectory: tmp,
          configurationPath: `${tmp}/shopify.app.dev.toml`,
          configuration: previousApp.configuration,
        })

      // When
      await use(options)

      // Then
      expect(setAppInfo).toHaveBeenCalledWith({
        directory: tmp,
        configFile: 'shopify.app.staging.toml',
        previousAppId: undefined,
      })
      expect(renderSuccess).toHaveBeenCalledWith({
        headline: 'Using configuration file shopify.app.staging.toml',
      })
    })
  })

  test('prompts user to choose a config file when argument is omitted', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      createConfigFile(tmp, 'shopify.app.local.toml')
      const options: UseOptions = {
        directory: tmp,
      }
      vi.mocked(selectConfigFile).mockResolvedValue(ok('shopify.app.local.toml'))

      const app = testAppWithLegacyConfig({
        config: {
          name: 'something',
          client_id: 'something',
          api_contact_email: 'bob@bob.com',
          webhook_api_version: '2023-04',
          application_url: 'https://example.com',
        },
      })
      vi.mocked(loadAppConfiguration).mockResolvedValue({
        appDirectory: tmp,
        configurationPath: app.configurationPath,
        configuration: app.configuration,
      })

      // When
      await use(options)

      // Then
      expect(setAppInfo).toHaveBeenCalledWith({
        directory: tmp,
        configFile: 'shopify.app.local.toml',
      })
      expect(renderSuccess).toHaveBeenCalledWith({
        headline: 'Using configuration file shopify.app.local.toml',
      })
    })
  })

  test('throws error when argument is omitted and no config file exists in the directory', async () => {
    await inTemporaryDirectory(async (tmp) => {
      // Given
      const options: UseOptions = {
        directory: tmp,
      }
      vi.mocked(selectConfigFile).mockResolvedValue(err('Could not find any shopify.app.toml file in the directory.'))

      // When
      const result = use(options)

      // Then
      await expect(result).rejects.toThrow(/Could not find any shopify\.app\.toml file in the directory./)
    })
  })
})

function createConfigFile(tmp: string, fileName: string) {
  const filePath = joinPath(tmp, fileName)
  writeFileSync(filePath, '')
}
