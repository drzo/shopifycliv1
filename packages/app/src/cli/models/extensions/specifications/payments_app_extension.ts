import {
  OffsitePaymentsAppExtensionConfigType,
  OffsitePaymentsAppExtensionSchema,
  offsitePaymentsAppExtensionDeployConfig,
  OFFSITE_TARGET,
} from './payments_app_extension_schemas/offsite_payments_app_extension_schema.js'
import {
  REDEEMABLE_TARGET,
  RedeemablePaymentsAppExtensionConfigType,
  redeemablePaymentsAppExtensionDeployConfig,
  RedeemablePaymentsAppExtensionSchema,
} from './payments_app_extension_schemas/redeemable_payments_app_extension_schema.js'
import {
  CUSTOM_ONSITE_TARGET,
  CustomOnsitePaymentsAppExtensionConfigType,
  customOnsitePaymentsAppExtensionDeployConfig,
  CustomOnsitePaymentsAppExtensionSchema,
} from './payments_app_extension_schemas/custom_onsite_payments_app_extension_schema.js'
import {createExtensionSpecification} from '../specification.js'
import {zod} from '@shopify/cli-kit/node/schema'

const PaymentsAppExtensionSchema = zod.union([
  OffsitePaymentsAppExtensionSchema,
  RedeemablePaymentsAppExtensionSchema,
  CustomOnsitePaymentsAppExtensionSchema,
])

export type PaymentsAppExtensionConfigType = zod.infer<typeof PaymentsAppExtensionSchema>

const spec = createExtensionSpecification({
  identifier: 'payments_extension',
  schema: PaymentsAppExtensionSchema,
  appModuleFeatures: (_) => [],
  deployConfig: async (config, _) => {
    const target = config.targeting[0]!.target
    switch (target) {
      case OFFSITE_TARGET:
        return offsitePaymentsAppExtensionDeployConfig(config as OffsitePaymentsAppExtensionConfigType)
      case REDEEMABLE_TARGET:
        return redeemablePaymentsAppExtensionDeployConfig(config as RedeemablePaymentsAppExtensionConfigType)
      case CUSTOM_ONSITE_TARGET:
        return customOnsitePaymentsAppExtensionDeployConfig(config as CustomOnsitePaymentsAppExtensionConfigType)
      default:
        return {}
    }
  },
})

export default spec
