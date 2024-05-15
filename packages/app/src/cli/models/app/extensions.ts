import {ExtensionFlavorValue} from '../../services/generate/extension.js'
import {BaseConfigType} from '../extensions/schemas.js'
import {ExtensionFeature} from '../extensions/specification.js'
import {FunctionConfigType} from '../extensions/specifications/function.js'
import {TokenizedString} from '@shopify/cli-kit/node/output'
import {Result} from '@shopify/cli-kit/node/result'

export type ExtensionCategory = 'ui' | 'function' | 'theme'

export interface ExtensionFlavor {
  name: string
  value: ExtensionFlavorValue
  path?: string
}

export interface Extension {
  idEnvironmentVariableName: string
  localIdentifier: string
  configurationPath: string
  directory: string
  type: string
  externalType: string
  graphQLType: string
  publishURL(options: {orgId: string; appId: string; extensionId?: string}): Promise<string>
  features: ExtensionFeature[]
}

export type FunctionExtension = Extension & {
  configuration: FunctionConfigType
  entrySourceFilePath?: string
  buildCommand: string | undefined
  outputPath: string
  inputQueryPath: string
  isJavaScript: boolean
  usingExtensionsFramework: boolean
}

export type ThemeExtension = Extension & {
  configuration: BaseConfigType
  previewMessage(url: string, storeFqdn: string): TokenizedString | undefined
  outputPath: string
}

export type UIExtension<TConfiguration extends BaseConfigType = BaseConfigType> = Extension & {
  configuration: TConfiguration
  entrySourceFilePath?: string
  outputPath: string
  devUUID: string
  surface: string
  dependency?: string
  getBundleExtensionStdinContent(): string
  validate(): Promise<Result<unknown, string>>
  preDeployValidation(): Promise<void>
  buildValidation(): Promise<void>
  previewMessage(url: string, storeFqdn: string): TokenizedString | undefined
  hasExtensionPointTarget(target: string): boolean
}
