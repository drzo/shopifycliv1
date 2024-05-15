import {AppInterface} from '../../models/app/app.js'
import {Identifiers} from '../../models/app/identifiers.js'
import {zip} from '@shopify/cli-kit/node/archiver'
import {renderConcurrent} from '@shopify/cli-kit/node/ui'
import {AbortSignal} from '@shopify/cli-kit/node/abort'
import {inTemporaryDirectory, mkdirSync, touchFile} from '@shopify/cli-kit/node/fs'
import {joinPath} from '@shopify/cli-kit/node/path'
import {Writable} from 'stream'
import {ExtensionInstance} from '../../models/extensions/extension-instance.js'

export interface BundleOptions {
  app: AppInterface
  modulesToDeploy: ExtensionInstance[]
  bundlePath?: string
  identifiers: Identifiers
}

export async function bundleAndBuildExtensions(options: BundleOptions) {
  await inTemporaryDirectory(async (tmpDir) => {
    const bundleDirectory = joinPath(tmpDir, 'bundle')
    await mkdirSync(bundleDirectory)
    await touchFile(joinPath(bundleDirectory, '.shopify'))

    await renderConcurrent({
      processes: options.modulesToDeploy.map((extension) => {
        return {
          prefix: extension.localIdentifier,
          action: async (stdout: Writable, stderr: Writable, signal: AbortSignal) => {
            await extension.buildForBundle(
              {stderr, stdout, signal, app: options.app},
              options.identifiers,
              bundleDirectory,
            )
          },
        }
      }),
      showTimestamps: false,
    })

    if (options.bundlePath) {
      await zip({
        inputDirectory: bundleDirectory,
        outputZipPath: options.bundlePath,
      })
    }
  })
}
