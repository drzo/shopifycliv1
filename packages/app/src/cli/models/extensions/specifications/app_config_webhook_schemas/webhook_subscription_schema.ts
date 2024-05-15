import {UriValidation, removeTrailingSlash} from '../validation/common.js'
import {zod} from '@shopify/cli-kit/node/schema'

export enum ComplianceTopic {
  CustomersRedact = 'customers/redact',
  CustomersDataRequest = 'customers/data_request',
  ShopRedact = 'shop/redact',
}

export const WebhookSubscriptionSchema = zod.object({
  topics: zod
    .array(zod.string({invalid_type_error: 'Values within array must be a string'}), {
      invalid_type_error: 'Value must be string[]',
    })
    .optional(),
  uri: zod.preprocess(removeTrailingSlash, UriValidation, {required_error: 'Missing value at'}),
  sub_topic: zod.string({invalid_type_error: 'Value must be a string'}).optional(),
  include_fields: zod.array(zod.string({invalid_type_error: 'Value must be a string'})).optional(),
  filter: zod.string({invalid_type_error: 'Value must be a string'}).optional(),
  compliance_topics: zod
    .array(
      zod.enum([ComplianceTopic.CustomersRedact, ComplianceTopic.CustomersDataRequest, ComplianceTopic.ShopRedact]),
      {
        invalid_type_error:
          'Value must be an array containing values: customers/redact, customers/data_request or shop/redact',
      },
    )
    .optional(),
})
