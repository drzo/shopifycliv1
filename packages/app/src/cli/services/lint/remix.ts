import {AppInterface, Web, isCurrentAppSchema} from '../../models/app/app.js'
import {joinPath} from '@shopify/cli-kit/node/path'
import {glob, readFile} from '@shopify/cli-kit/node/fs'
import {renderWarning} from '@shopify/cli-kit/node/ui'
import {captureOutput} from '@shopify/cli-kit/node/system'
import {decodeToml} from '@shopify/cli-kit/node/toml'

interface RemixRoute {
  path: string
  children?: RemixRoute[]
}

function flattenedRemixRoutes(routes: RemixRoute[]): RemixRoute[] {
  return routes.reduce((flatRoutes: RemixRoute[], route: RemixRoute) => {
    if (typeof route.path === 'string') flatRoutes.push(route)
    flatRoutes.push(...flattenedRemixRoutes(route.children ?? []))
    return flatRoutes
  }, [])
}

function pathMatches(routePath: string, concretePath: string): boolean {
  return new RegExp(`^/?${routePath.replace(/\/\*$/, '.*')}$`).test(concretePath)
}

async function sourceFilePaths(remixApp: Web): Promise<string[]> {
  const target = joinPath(remixApp.directory, '**/*.{js,jsx,ts,tsx}')
  return glob(target, {ignore: ['**.d.ts', '**.test.ts', '**/node_modules/**']})
}

async function searchInFiles(filePaths: string[], predicate: (fileContents: string) => boolean): Promise<boolean> {
  for await (const file of filePaths) {
    const fileContents = await readFile(file)
    if (predicate(fileContents)) {
      return true
    }
  }
  return false
}

interface AppConfig {
  application_url: string
  auth?: {redirect_urls?: string[]}
  embedded: boolean
}

export async function lintRemix(app: AppInterface, remixApp: Web): Promise<void> {
  const appConfig = decodeToml(await readFile(joinPath(app.directory, 'shopify.app.toml'))) as AppConfig

  await Promise.all([
    execLinter(app, remixApp),
    isCurrentAppSchema(app.configuration) && execRouteChecks(app, remixApp, appConfig),
    appConfig.embedded === true && execEmbeddedAppChecks(remixApp),
  ])
}

async function execRouteChecks(app: AppInterface, remixApp: Web, appConfig: AppConfig): Promise<void> {
  const remixRoutes = flattenedRemixRoutes(
    JSON.parse(
      await captureOutput(
        app.packageManager,
        [
          'exec',
          'remix',
          'routes',
          app.packageManager === 'npm' ? '--' : '',
          '--json',
        ],
        {cwd: remixApp.directory}
      ),
    ),
  )

  const appHomePath = new URL(appConfig.application_url).pathname
  const appHomeRemixRoute = remixRoutes.find(({path}) => pathMatches(path, appHomePath))
  if (!appHomeRemixRoute) {
    renderWarning({
      headline: 'Application URL does not match any routes',
      body: [
        'The application URL you have configured does not match any of the routes in your app. This means that when a merchant installs your app, they will see an error page.',
      ],
    })
  }

  const oauthCallbackPaths = appConfig.auth?.redirect_urls?.map((url) => new URL(url).pathname)
  if (oauthCallbackPaths) {
    if (!oauthCallbackPaths.some((url) => remixRoutes.some(({path}) => pathMatches(path, url)))) {
      renderWarning({
        headline: 'OAuth callback URLs not handled',
        body: [
          'Your app does not contain a handler for the registered OAuth callback URL(s). You must implement OAuth to authenticate merchants. For more information, see',
          {
            link: {
              url: 'https://shopify.dev/docs/api/shopify-app-remix/v2/authenticate/admin',
              label: 'Authentication with Remix'
            },
          }
        ],
        reference: [
          {
            link: {
              url: 'https://shopify.dev/docs/apps/auth',
              label: 'Authentication and authorization overview'
            },
          }
        ],
      })
    }
  }
}

async function execLinter(app: AppInterface, remixApp: Web) {
  let lintResults = ''
  let lintError = ''
  let lintExitCode = 0
  try {
    lintResults = await captureOutput(
      app.packageManager,
      [
        'run',
        '--silent',
        'lint',
        app.packageManager === 'npm' ? '--' : '',
        '--plugin',
        '@shopify/remix-app',
      ],
      {cwd: remixApp.directory}
    )
  } catch(error: any) {
    const {exitCode, stdout, stderr} = (error as {exitCode: number; stdout: string; stderr: string})
    lintExitCode = exitCode
    if (lintExitCode === 1) {
      lintResults = stdout
    } else {
      lintError = stderr
    }
  }
  if (![0, 1].includes(lintExitCode)) {
    renderWarning({
      headline: 'Code analysis failed',
      body: [
        'ESLint failed to analyze your app.',
        'Correct the error to locate potential failures in your app’s compliance with Shopify’s requirements.\n\n',
        'The error was:\n\n',
        lintError.trim(),
      ],
    })
  } else if (lintResults.trim().length > 0) {
    renderWarning({
      headline: 'Warnings from code analysis',
      body: [
        'ESLint warnings were detected in your app.',
        'They may indicate potential failures in your app’s compliance with Shopify’s requirements.\n\n',
        lintResults.trim(),
      ],
    })
  }
}

async function execEmbeddedAppChecks(remixApp: Web): Promise<void> {
  const filePaths = await sourceFilePaths(remixApp)

  const [usesSessionTokens, usesShopifyAppRemixPackage] = await Promise.all([
    searchInFiles(filePaths, (content: string) => content.includes('getSessionToken')),
    searchInFiles(filePaths, (content: string) => content.includes('@shopify/shopify-app-remix'),),
  ])

  const usesAppBridge =
  usesShopifyAppRemixPackage ||
  (await searchInFiles(filePaths, (content: string) => /cdn\.shopify\.com.*app-bridge\.js/.test(content)))

  if (!usesSessionTokens) {
    renderWarning({
      headline: 'Use of session tokens not detected',
      body: [
        'Embedded apps must use session tokens. For more information, see requirements for',
        {
          link: {
            url: 'https://shopify.dev/docs/apps/store/requirements#a-security',
            label: 'Security and merchant risk',
          },
        },
      ],
      reference: [
        {
          link: {
            url: 'https://shopify.dev/docs/apps/auth/session-tokens/getting-started',
            label: 'Getting started with session token authentication',
          },
        },
      ],
    })
  }

  if (!usesAppBridge) {
    renderWarning({
      headline: 'Shopify App Bridge not detected',
      body: [
        'Your embedded app must use Shopify App Bridge. For more information, see',
        {
          link: {
            url: 'https://shopify.dev/docs/apps/store/requirements#a-embedding-into-the-shopify-admin',
            label: 'Embedding into the Shopify admin',
          },
        },
      ],
      reference: [
        {
          link: {
            url: 'https://shopify.dev/docs/api/app-bridge-library',
            label: 'App Bridge',
          },
        },
      ],
    })
  }
}
