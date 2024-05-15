import {createConfigExtensionSpecification} from '../specification.js'
import {zod} from '@shopify/cli-kit/node/schema'

export const AppExtensionCollectionsIdentifier = 'extension_collection'
export const AppExtensionCollectionsHandle = 'extension-collection'

const AppExtensionCollectionsSchema = zod.object({
  extension_collections: zod
    .array(
      zod.object({
        name: zod.string().max(30),
        handle: zod.string(),
        extensions: zod.array(zod.string()),
      }),
    )
    .optional(),
})

export type AppExtensionCollectionType = zod.infer<typeof AppExtensionCollectionsSchema>

const spec = createConfigExtensionSpecification({
  identifier: AppExtensionCollectionsIdentifier,
  schema: AppExtensionCollectionsSchema,
})

export default spec
