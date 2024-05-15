import {App, AppInterface} from '../../models/app/app.js'
import {load as loadApp} from '../../models/app/loader.js'
import {loadExtensionsSpecifications} from '../../models/extensions/load-specifications.js'
import {ExtensionInstance} from '../../models/extensions/extension-instance.js'
import {FunctionConfigType} from '../../models/extensions/specifications/function.js'
import {resolvePath, cwd} from '@shopify/cli-kit/node/path'
import {AbortError} from '@shopify/cli-kit/node/error'
import {Config, Flags} from '@oclif/core'

export const functionFlags = {
  path: Flags.string({
    hidden: false,
    description: 'The path to your function directory.',
    parse: async (input) => resolvePath(input),
    default: async () => cwd(),
    env: 'SHOPIFY_FLAG_PATH',
  }),
}

export async function inFunctionContext(
  config: Config,
  path: string,
  callback: (app: App, ourFunction: ExtensionInstance<FunctionConfigType>) => Promise<void>,
) {
  const specifications = await loadExtensionsSpecifications(config)
  const app: AppInterface = await loadApp({specifications, directory: path})

  const allFunctions = app.allExtensions.filter((ext) => ext.isFunctionExtension)
  const ourFunction = allFunctions.find((fun) => fun.directory === path) as ExtensionInstance<FunctionConfigType>
  if (ourFunction) {
    return callback(app, ourFunction)
  } else {
    throw new AbortError('Run this command from a function directory or use `--path` to specify a function directory.')
  }
}
