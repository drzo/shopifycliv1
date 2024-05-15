import {ExtensionRegistration} from '../../api/graphql/all_app_extension_registrations.js'
import {BasePaymentsAppExtensionDeployConfigType} from '../../models/extensions/specifications/payments_app_extension_schemas/base_payments_app_extension_schema.js'
import {
  RedeemablePaymentsAppExtensionDeployConfigType,
  redeemableDeployConfigToCLIConfig,
} from '../../models/extensions/specifications/payments_app_extension_schemas/redeemable_payments_app_extension_schema.js'
import {
  OffsitePaymentsAppExtensionDeployConfigType,
  offsiteDeployConfigToCLIConfig,
} from '../../models/extensions/specifications/payments_app_extension_schemas/offsite_payments_app_extension_schema.js'
import {
  CustomCreditCardPaymentsAppExtensionDeployConfigType,
  customCreditCardDeployConfigToCLIConfig,
} from '../../models/extensions/specifications/payments_app_extension_schemas/custom_credit_card_payments_app_extension_schema.js'
import {
  CreditCardPaymentsAppExtensionDeployConfigType,
  creditCardDeployConfigToCLIConfig,
} from '../../models/extensions/specifications/payments_app_extension_schemas/credit_card_payments_app_extension_schema.js'
import {
  CustomOnsitePaymentsAppExtensionDeployConfigType,
  customOnsiteDeployConfigToCLIConfig,
} from '../../models/extensions/specifications/payments_app_extension_schemas/custom_onsite_payments_app_extension_schema.js'
import {encodeToml} from '@shopify/cli-kit/node/toml'
import {slugify} from '@shopify/cli-kit/common/string'

function typeToContext(type: string) {
  switch (type) {
    case DashboardPaymentExtensionType.Offsite:
      return 'offsite'
    case DashboardPaymentExtensionType.CreditCard:
      return 'credit-card'
    case DashboardPaymentExtensionType.CustomCreditCard:
      return 'custom-credit-card'
    case DashboardPaymentExtensionType.CustomOnsite:
      return 'custom-onsite'
    case DashboardPaymentExtensionType.Redeemable:
      return 'redeemable'
  }
}

export enum DashboardPaymentExtensionType {
  Offsite = 'payments_app',
  CreditCard = 'payments_app_credit_card',
  CustomCreditCard = 'payments_app_custom_credit_card',
  CustomOnsite = 'payments_app_custom_onsite',
  Redeemable = 'payments_app_redeemable',
}

export function buildTomlObject(extension: ExtensionRegistration): string {
  switch (extension.type) {
    case DashboardPaymentExtensionType.Offsite:
      return buildPaymentsToml<OffsitePaymentsAppExtensionDeployConfigType>(extension, offsiteDeployConfigToCLIConfig)
    case DashboardPaymentExtensionType.CreditCard:
      return buildPaymentsToml<CreditCardPaymentsAppExtensionDeployConfigType>(
        extension,
        creditCardDeployConfigToCLIConfig,
      )
    case DashboardPaymentExtensionType.CustomCreditCard:
      return buildPaymentsToml<CustomCreditCardPaymentsAppExtensionDeployConfigType>(
        extension,
        customCreditCardDeployConfigToCLIConfig,
      )
    case DashboardPaymentExtensionType.CustomOnsite:
      return buildPaymentsToml<CustomOnsitePaymentsAppExtensionDeployConfigType>(
        extension,
        customOnsiteDeployConfigToCLIConfig,
      )
    case DashboardPaymentExtensionType.Redeemable:
      return buildPaymentsToml<RedeemablePaymentsAppExtensionDeployConfigType>(
        extension,
        redeemableDeployConfigToCLIConfig,
      )
    default:
      throw new Error('Unsupported extension type')
  }
}
/**
 * Given a dashboard-built payments extension config file, convert it to toml for the CLI extension
 */
function buildPaymentsToml<T extends BasePaymentsAppExtensionDeployConfigType>(
  extension: ExtensionRegistration,
  serialize: (config: T) => {[key: string]: unknown} | undefined,
) {
  const version = extension.activeVersion ?? extension.draftVersion
  const versionConfig = version?.config
  if (!versionConfig) throw new Error('No config found for extension')
  const dashboardConfig: T = JSON.parse(versionConfig)

  const cliConfig = serialize(dashboardConfig)
  if (cliConfig) delete cliConfig.api_version

  const localExtensionRepresentation = {
    api_version: dashboardConfig.api_version,
    extensions: [
      {
        name: extension.title,
        type: 'payments_extension',
        handle: slugify(extension.title),
        ...cliConfig,
        targeting: [
          {
            target: `payments.${typeToContext(extension.type)}.render`,
          },
        ],
      },
    ],
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return encodeToml(localExtensionRepresentation as any)
}
