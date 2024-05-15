import {WebhookSimplifyConfig} from './app_config_webhook.js'
import {UriValidation, removeTrailingSlash} from './validation/common.js'
import {CustomTransformationConfig, createConfigExtensionSpecification} from '../specification.js'
import {getPathValue} from '@shopify/cli-kit/common/object'
import {zod} from '@shopify/cli-kit/node/schema'

export const WebhookSubscriptionSpecIdentifier = 'webhook_subscription'

interface TransformedWebhookSubscription {
  api_version: string
  uri: string
  topic: string
  compliance_topics?: string[]
  sub_topic?: string
  include_fields?: string[]
}

/* this transforms webhooks from the TOML config to be parsed remotely
ie.
  given:
  {
    webhooks: {
          api_version: '2024-01',
          subscriptions: [
            {
              topics: ['orders/delete', 'orders/create'],
              uri: 'https://example.com/webhooks/orders',
            },
            {
              topics: ['products/create'],
              uri: 'https://example.com/webhooks/products',
            },
          ]
      }
  }
  the function should return:
  {
    subscriptions: [
      { topic: 'products/create', uri: 'https://example.com/webhooks/products'},
      { topic: 'orders/delete', uri: https://example.com/webhooks/orderss'},
      { topic: 'orders/create', uri: 'https://example.com/webhooks/orders'},
    ]
  }
  */
function transformFromWebhookSubscriptionConfig(content: object) {
  return content
}

/* this transforms webhooks remotely to be accepted by the TOML
ie.
  given:
  {
    subscriptions: [
      { topic: 'products/create', uri: 'https://example.com/webhooks/products'},
      { topic: 'orders/delete', uri: https://example.com/webhooks/orderss'},
      { topic: 'orders/create', uri: 'https://example.com/webhooks/orders'},
    ]
  }
  the function should return:
  {
    webhooks: {
          api_version: '2024-01',
          subscriptions: [
            {
              topics: ['orders/delete', 'orders/create'],
              uri: 'https://example.com/webhooks/orders',
            },
            {
              topics: ['products/create'],
              uri: 'https://example.com/webhooks/products',
            },
          ]
      }
  }
  */
function transformToWebhookSubscriptionConfig(content: object) {
  const subscriptions = getPathValue(content, 'subscriptions') as TransformedWebhookSubscription[]
  if (!subscriptions) return {}

  const subscriptionsArray = subscriptions.map((subscription: TransformedWebhookSubscription) => {
    const {topic, ...otherFields} = subscription
    return {
      topics: [topic],
      ...otherFields,
    }
  })

  return {
    webhooks: {
      subscriptions: subscriptionsArray,
    },
  }
}

const WebhookSubscriptionTransformConfig: CustomTransformationConfig = {
  forward: (content: object) => transformFromWebhookSubscriptionConfig(content),
  reverse: (content: object) => transformToWebhookSubscriptionConfig(content),
}

const WebhookSingleSubscriptionSchema = zod.object({
  topic: zod.string().optional(),
  api_version: zod.string(),
  uri: zod.preprocess(removeTrailingSlash, UriValidation, {required_error: 'Missing value at'}),
  sub_topic: zod.string({invalid_type_error: 'Value must be a string'}).optional(),
  include_fields: zod.array(zod.string({invalid_type_error: 'Value must be a string'})).optional(),
})

const appWebhookSubscriptionSpec = createConfigExtensionSpecification({
  identifier: WebhookSubscriptionSpecIdentifier,
  schema: WebhookSingleSubscriptionSchema,
  transformConfig: WebhookSubscriptionTransformConfig,
  simplify: WebhookSimplifyConfig,
  extensionManagedInToml: true,
  multipleModuleConfigPath: 'subscriptions',
  uidStrategy: 'dynamic',
})

export default appWebhookSubscriptionSpec
