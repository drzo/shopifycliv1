import {createExtensionSpecification} from '../specification.js'
import {BaseSchema} from '../schemas.js'
import {zod} from '@shopify/cli-kit/node/schema'

const TaxCalculationsSchema = BaseSchema.extend({
  production_api_base_url: zod.string(),
  benchmark_api_base_url: zod.string().optional(),
  calculate_taxes_api_endpoint: zod.string(),
})

const spec = createExtensionSpecification({
  identifier: 'tax_calculation',
  surface: 'admin',
  schema: TaxCalculationsSchema,
  singleEntryPath: false,
  appModuleFeatures: (_) => [],
  deployConfig: async (config, _) => {
    return {
      production_api_base_url: config.production_api_base_url,
      benchmark_api_base_url: config.benchmark_api_base_url,
      calculate_taxes_api_endpoint: config.calculate_taxes_api_endpoint,
      metafields: config.metafields,
    }
  },
})

export default spec
