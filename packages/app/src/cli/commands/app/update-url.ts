import Command from '../../utilities/app-command.js'
import updateURL, {UpdateURLOptions} from '../../services/app/update-url.js'
import {showApiKeyDeprecationWarning} from '../../prompts/deprecation-warnings.js'
import {loadLocalExtensionsSpecifications} from '../../models/extensions/load-specifications.js'
import {AppInterface} from '../../models/app/app.js'
import {loadApp} from '../../models/app/loader.js'
import {globalFlags} from '@shopify/cli-kit/node/cli'
import {Flags} from '@oclif/core'

export default class UpdateURL extends Command {
  static description = 'Update your app and redirect URLs in the Partners Dashboard.'

  static flags = {
    ...globalFlags,
    'api-key': Flags.string({
      hidden: true,
      description: 'The API key of your app.',
      env: 'SHOPIFY_FLAG_APP_API_KEY',
    }),
    'client-id': Flags.string({
      hidden: false,
      description: 'The Client ID of your app.',
      env: 'SHOPIFY_FLAG_CLIENT_ID',
    }),
    'app-url': Flags.string({
      hidden: false,
      description: 'URL through which merchants will access your app.',
      env: 'SHOPIFY_FLAG_APP_URL',
    }),
    'redirect-urls': Flags.string({
      hidden: false,
      description: 'Comma separated list of allowed URLs where merchants are redirected after the app is installed',
      env: 'SHOPIFY_FLAG_REDIRECT_URLS',
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(UpdateURL)
    if (flags['api-key']) showApiKeyDeprecationWarning()
    const apiKey = flags['client-id'] || flags['api-key']

    const specifications = await loadLocalExtensionsSpecifications(this.config)
    const app: AppInterface = await loadApp({
      specifications,
      directory: flags.path,
      configName: flags.config,
      mode: 'report',
    })

    const options: UpdateURLOptions = {
      app,
      apiKey,
      appURL: flags['app-url'],
      redirectURLs: flags['redirect-urls']?.split(','),
    }
    await updateURL(options)
  }
}
