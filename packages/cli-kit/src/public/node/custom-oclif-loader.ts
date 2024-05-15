import {Command, Config} from '@oclif/core'
import {Options} from '@oclif/core/lib/interfaces/plugin.js'

export class ShopifyConfig extends Config {
  constructor(options: Options) {
    // const path = sniffForPath() ?? cwd()
    // if (fileExistsSync(joinPath(`${path}`, 'package.json'))) {
    //   options.pluginAdditions = {
    //     core: ['@shopify/cli-hydrogen'],
    //     path,
    //   }
    // }
    super(options)

    // this['determinePriority'] = this.customPriority
  }

  customPriority(commands: Command.Loadable[]): Command.Loadable | undefined {
    const oclifPlugins = this.pjson.oclif?.plugins ?? []
    const commandPlugins = commands.sort((aCommand, bCommand) => {
      // eslint-disable-next-line no-restricted-syntax
      const pluginAliasA = aCommand.pluginAlias ?? 'A-Cannot-Find-This'
      // eslint-disable-next-line no-restricted-syntax
      const pluginAliasB = bCommand.pluginAlias ?? 'B-Cannot-Find-This'
      const aIndex = oclifPlugins.indexOf(pluginAliasA)
      const bIndex = oclifPlugins.indexOf(pluginAliasB)

      // Hydrogen has higher priority than core plugins to override the custom init method.
      if (aCommand.pluginType === 'core' && bCommand.pluginAlias === '@shopify/cli-hydrogen') {
        // If b is hydrogen and a is core sort b first
        return 1
      }

      if (aCommand.pluginAlias === '@shopify/cli-hydrogen' && bCommand.pluginType === 'core') {
        // If a is hydrogen and b is core sort a first
        return -1
      }

      // All other cases are the default implementation from the private `determinePriority` method
      // When both plugin types are 'core' plugins sort based on index
      if (aCommand.pluginType === 'core' && bCommand.pluginType === 'core') {
        // If b appears first in the pjson.plugins sort it first
        return aIndex - bIndex
      }

      // if b is a core plugin and a is not sort b first
      if (bCommand.pluginType === 'core' && aCommand.pluginType !== 'core') {
        return 1
      }

      // if a is a core plugin and b is not sort a first
      if (aCommand.pluginType === 'core' && bCommand.pluginType !== 'core') {
        return -1
      }

      // if a is a jit plugin and b is not sort b first
      if (aCommand.pluginType === 'jit' && bCommand.pluginType !== 'jit') {
        return 1
      }

      // if b is a jit plugin and a is not sort a first
      if (bCommand.pluginType === 'jit' && aCommand.pluginType !== 'jit') {
        return -1
      }

      // neither plugin is core, so do not change the order
      return 0
    })
    return commandPlugins[0]
  }
}

/**
 * Tries to get the value of the `--path` argument, if provided.
 *
 * @returns The value of the `--path` argument, if provided.
 */
function sniffForPath(): string | undefined {
  const pathFlagIndex = process.argv.indexOf('--path')
  if (pathFlagIndex === -1) return
  const pathFlag = process.argv[pathFlagIndex + 1]
  if (!pathFlag || pathFlag.startsWith('-')) return
  return pathFlag
}
