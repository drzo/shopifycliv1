import {ExtensionFeature, createExtensionSpecification} from '../specification.js'
import {NewExtensionPointSchemaType, NewExtensionPointsSchema, BaseSchema} from '../schemas.js'
import {loadLocalesConfig} from '../../../utilities/extensions/locales-configuration.js'
import {configurationFileNames} from '../../../constants.js'
import {getExtensionPointTargetSurface} from '../../../services/dev/extension/utilities.js'
import {err, ok, Result} from '@shopify/cli-kit/node/result'
import {fileExists} from '@shopify/cli-kit/node/fs'
import {joinPath} from '@shopify/cli-kit/node/path'
import {outputContent, outputToken} from '@shopify/cli-kit/node/output'

const dependency = '@shopify/checkout-ui-extensions'

function trimToForty(string = '') {
  // Spread to array to convert characters to codepoints
  // to account for emojis and other multi-character symbols.
  const chars = [...string]
  return chars.length > 40 ? `${chars.slice(0, 40).join('')}…` : string
}

const validatePoints = (config: {extension_points?: unknown[]; targeting?: unknown[]}) => {
  return config.extension_points !== undefined || config.targeting !== undefined
}

const missingExtensionPointsMessage = 'No extension targets defined, add a `targeting` field to your configuration'

const UIExtensionSchema = BaseSchema.extend({
  extension_points: NewExtensionPointsSchema.optional(),
  targeting: NewExtensionPointsSchema.optional(),
})
  .refine((config) => validatePoints(config), missingExtensionPointsMessage)
  .transform((config) => {
    const extensionPoints = (config.targeting ?? config.extension_points ?? []).map((targeting) => {
      return {
        target: targeting.target,
        module: targeting.module,
        metafields: targeting.metafields ?? config.metafields ?? [],
      }
    })
    return {...config, extension_points: extensionPoints}
  })

const spec = createExtensionSpecification({
  identifier: 'ui_extension',
  dependency,
  partnersWebIdentifier: 'ui_extension',
  singleEntryPath: false,
  schema: UIExtensionSchema,
  appModuleFeatures: (config) => {
    const basic: ExtensionFeature[] = ['ui_preview', 'bundling', 'esbuild']
    const needsCart =
      config.extension_points?.find((extensionPoint) => {
        return getExtensionPointTargetSurface(extensionPoint.target) === 'checkout'
      }) !== undefined
    return needsCart ? [...basic, 'cart_url'] : basic
  },
  validate: async (config, directory) => {
    console.log(config.type, config.name, 'this is in ui_extension.ts')
    return validateUIExtensionPointConfig(directory, config.extension_points, config.type)
  },
  deployConfig: async (config, directory) => {
    return {
      api_version: config.api_version,
      extension_points: config.extension_points,
      capabilities: config.capabilities,
      name: config.name,
      settings: config.settings,
      localization: await loadLocalesConfig(directory, config.type),
    }
  },
  getBundleExtensionStdinContent: (config) => {
    return config.extension_points.map(({module}) => `import '${module}';`).join('\n')
  },
  shouldFetchCartUrl: (config) => {
    return (
      config.extension_points.find((extensionPoint) => {
        return getExtensionPointTargetSurface(extensionPoint.target) === 'checkout'
      }) !== undefined
    )
  },
  hasExtensionPointTarget: (config, requestedTarget) => {
    return (
      config.extension_points.find((extensionPoint) => {
        return extensionPoint.target === requestedTarget
      }) !== undefined
    )
  },
})

async function validateUIExtensionPointConfig(
  directory: string,
  extensionPoints: NewExtensionPointSchemaType[],
  type: string,
): Promise<Result<unknown, string>> {
  const errors: string[] = []
  const uniqueTargets: string[] = []
  const duplicateTargets: string[] = []

  if (!extensionPoints || extensionPoints.length === 0) {
    return err(missingExtensionPointsMessage)
  }
  const localesConfig = await loadLocalesConfig(directory, type)
  const {translations} = localesConfig

  for (const locale in translations) {
    if (Object.prototype.hasOwnProperty.call(translations, locale)) {
      const translation = translations[locale];

      if (translation) {
        const decodedTranslation = Buffer.from(translation, 'base64').toString('utf8')
        const translationObj = JSON.parse(decodedTranslation);
        // console.log(translationObj);
        if (translationObj.name && translationObj.name.length >= 40) {
          // console.log('You have successfully identified a title which is too long!')
          return err(`The title: ${translationObj.name} for locale ${locale} exceeds 40 characters!!.`)
        }
      }
    }
  }

  for await (const {module, target} of extensionPoints) {
    const fullPath = joinPath(directory, module)
    const exists = await fileExists(fullPath)

    if (!exists) {
      const notFoundPath = outputToken.path(joinPath(directory, module))

      errors.push(
        outputContent`Couldn't find ${notFoundPath}
Please check the module path for ${target}`.value,
      )
    }

    if (uniqueTargets.indexOf(target) === -1) {
      uniqueTargets.push(target)
    } else {
      duplicateTargets.push(target)
    }
  }

  if (duplicateTargets.length) {
    errors.push(`Duplicate targets found: ${duplicateTargets.join(', ')}\nExtension point targets must be unique`)
  }

  if (errors.length) {
    const tomlPath = joinPath(directory, configurationFileNames.extension.ui)

    errors.push(`Please check the configuration in ${tomlPath}`)
    return err(errors.join('\n\n'))
  }
  return ok({})
}

export default spec
