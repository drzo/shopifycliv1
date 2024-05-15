import {themeFlags} from '../../flags.js'
import ThemeCommand from '../../utilities/theme-command.js'
import {ensureThemeStore} from '../../utilities/theme-store.js'
import {globalFlags} from '@shopify/cli-kit/node/cli'
import {ensureAuthenticatedStorefront, ensureAuthenticatedThemes} from '@shopify/cli-kit/node/session'
import {execCLI2} from '@shopify/cli-kit/node/ruby'
import {renderInfo} from '@shopify/cli-kit/node/ui'
import {Flags} from '@oclif/core'

export default class Console extends ThemeCommand {
  static description = 'Shopify Liquid REPL (read-eval-print loop) tool'

  static flags = {
    ...globalFlags,
    store: themeFlags.store,
    password: themeFlags.password,
    environment: themeFlags.environment,
    page: Flags.string({
      description: 'The page path to be used as context',
      env: 'SHOPIFY_FLAG_PAGE',
      default: '/',
    }),
    port: Flags.string({
      description: 'Local port to serve authentication service.',
      env: 'SHOPIFY_FLAG_PORT',
      default: '9293',
    }),
  }

  async run() {
    const {flags} = await this.parse(Console)
    const store = ensureThemeStore(flags)
    const {password, page, port} = flags

    const adminSession = await ensureAuthenticatedThemes(store, password, [], true)
    const storefrontToken = await ensureAuthenticatedStorefront([], password)
    const authUrl = `http://localhost:${port}/password`

    renderInfo({
      body: ['Activate Shopify Liquid console on', {link: {label: 'your browser', url: authUrl}}, {char: '.'}],
    })

    return execCLI2(['theme', 'console', '--page', page, '--port', port], {
      store,
      adminToken: adminSession.token,
      storefrontToken,
    })
  }
}
