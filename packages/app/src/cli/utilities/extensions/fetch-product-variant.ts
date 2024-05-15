import {mapExtensionTypeToExternalExtensionType} from './name-mapper.js'
import {api, error, session} from '@shopify/cli-kit'
import {errAsync, okAsync, ResultAsync} from '@shopify/cli-kit/common/typing/result/result-async'

const NoProductsError = (storeFqdn: string) => {
  return new error.Abort(
    'Could not find a product variant',
    `Your store needs to have at least one product to test a ${mapExtensionTypeToExternalExtensionType(
      'checkout_ui_extension',
    )}\n
You can add a new product here: https://${storeFqdn}/admin/products/new`,
  )
}

/**
 * Retrieve the first variant of the first product of the given store
 * @param store {string} Store FQDN
 * @returns {Promise<string>} variantID if exists
 */
export async function fetchProductVariant(store: string) {
  return ResultAsync.fromPromise(session.ensureAuthenticatedAdmin(store), (err) => err)
    .andThen((adminSession) => {
      const query = api.graphql.FindProductVariantQuery
      return api.admin.request<api.graphql.FindProductVariantSchema>(query, adminSession)
    })
    .andThen((result) => mapFetchProductVariantResult(result, store))
    .unwrapOrThrow()
}

function mapFetchProductVariantResult(result: api.graphql.FindProductVariantSchema, store: string) {
  const products = result.products.edges
  if (products.length === 0) {
    return errAsync(NoProductsError(store))
  }
  const variantURL = products[0].node.variants.edges[0].node.id
  const variantId = variantURL.split('/').pop()
  return okAsync(variantId)
}
