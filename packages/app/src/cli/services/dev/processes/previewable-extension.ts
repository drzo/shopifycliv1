import {BaseProcess, DevProcessFunction} from './types.js'
import {devUIExtensions} from '../extension.js'
import {ExtensionInstance} from '../../../models/extensions/extension-instance.js'
import {fetchProductVariant} from '../../../utilities/extensions/fetch-product-variant.js'
import {DotEnvFile} from '@shopify/cli-kit/node/dot-env'

export const MANIFEST_VERSION = '3'

export interface PreviewableExtensionOptions {
  apiKey: string
  storeFqdn: string
  port: number
  pathPrefix: string
  cartUrl?: string
  subscriptionProductUrl?: string
  proxyUrl: string
  appName: string
  appDotEnvFile?: DotEnvFile
  appDirectory: string
  appId?: string
  grantedScopes: string[]
  previewableExtensions: ExtensionInstance[]
}

export interface PreviewableExtensionProcess extends BaseProcess<PreviewableExtensionOptions> {
  type: 'previewable-extension'
}

export const launchPreviewableExtensionProcess: DevProcessFunction<PreviewableExtensionOptions> = async (
  {stderr, stdout, abortSignal},
  {
    apiKey,
    storeFqdn,
    subscriptionProductUrl,
    port,
    cartUrl,
    proxyUrl,
    appName,
    appDotEnvFile,
    appId,
    grantedScopes,
    previewableExtensions,
    appDirectory,
  },
) => {
  await devUIExtensions({
    appName,
    appDotEnvFile,
    appDirectory,
    id: appId,
    extensions: previewableExtensions,
    stdout,
    stderr,
    signal: abortSignal,
    url: proxyUrl,
    port,
    storeFqdn,
    apiKey,
    grantedScopes,
    checkoutCartUrl: cartUrl,
    subscriptionProductUrl,
    manifestVersion: MANIFEST_VERSION,
  })
}

export async function setupPreviewableExtensionsProcess({
  allExtensions,
  storeFqdn,
  checkoutCartUrl,
  ...options
}: Omit<PreviewableExtensionOptions, 'pathPrefix' | 'previewableExtensions' | 'port' | 'cartUrl'> & {
  allExtensions: ExtensionInstance[]
  checkoutCartUrl?: string
}): Promise<PreviewableExtensionProcess | undefined> {
  const previewableExtensions = allExtensions.filter((ext) => ext.isPreviewable)
  if (previewableExtensions.length === 0) {
    return
  }

  const cartUrl = await buildCartURLIfNeeded(previewableExtensions, storeFqdn, checkoutCartUrl)

  return {
    prefix: 'extensions',
    type: 'previewable-extension',
    function: launchPreviewableExtensionProcess,
    options: {
      pathPrefix: '/extensions',
      port: -1,
      storeFqdn,
      previewableExtensions,
      cartUrl,
      ...options,
    },
  }
}

/**
 * To prepare Checkout UI Extensions for dev'ing we need to retrieve a valid product variant ID
 * @param extensions - The UI Extensions to dev
 * @param store - The store FQDN
 */
export async function buildCartURLIfNeeded(extensions: ExtensionInstance[], store: string, checkoutCartUrl?: string) {
  const hasUIExtension = extensions.map((ext) => ext.type).includes('checkout_ui_extension')
  if (!hasUIExtension) return undefined
  if (checkoutCartUrl) return checkoutCartUrl
  const variantId = await fetchProductVariant(store)
  return `/cart/${variantId}:1`
}
