import {PushConfig, PushConfigSchema, PushConfigVariables} from '../../../api/graphql/push_config.js'
import {ClearScopesSchema, clearRequestedScopes} from '../../../api/graphql/clear_requested_scopes.js'
import {App, GetConfig, GetConfigQuerySchema} from '../../../api/graphql/get_config.js'
import {
  AppConfiguration,
  CurrentAppConfiguration,
  isCurrentAppSchema,
  usesLegacyScopesBehavior,
  getAppScopesArray,
} from '../../../models/app/app.js'
import {DeleteAppProxySchema, deleteAppProxy} from '../../../api/graphql/app_proxy_delete.js'
import {ensureAuthenticatedPartners} from '@shopify/cli-kit/node/session'
import {partnersRequest} from '@shopify/cli-kit/node/api/partners'
import {AbortError} from '@shopify/cli-kit/node/error'
import {renderSuccess} from '@shopify/cli-kit/node/ui'
import {OutputMessage} from '@shopify/cli-kit/node/output'
import {basename} from '@shopify/cli-kit/node/path'

export interface Options {
  configuration: AppConfiguration
  configurationPath: string
}

const FIELD_NAMES: {[key: string]: string} = {
  title: 'name',
  api_key: 'client_id',
  redirect_url_whitelist: 'auth > redirect_urls',
  requested_access_scopes: 'access_scopes > scopes',
  webhook_api_version: 'webhooks > api_version',
  gdpr_webhooks: 'webhooks.privacy_compliance',
  'gdpr_webhooks,customer_deletion_url': 'webhooks.privacy_compliance > customer_deletion_url',
  'gdpr_webhooks,customer_data_request_url': 'webhooks.privacy_compliance > customer_data_request_url',
  'gdpr_webhooks,shop_deletion_url': 'webhooks.privacy_compliance > shop_deletion_url',
  proxy_sub_path: 'app_proxy > subpath',
  proxy_sub_path_prefix: 'app_proxy > prefix',
  proxy_url: 'app_proxy > url',
  preferences_url: 'app_preferences > url',
}

export async function pushConfig({configuration, configurationPath}: Options) {
  if (isCurrentAppSchema(configuration)) {
    const token = await ensureAuthenticatedPartners()
    const configFileName = basename(configurationPath)

    const queryVariables = {apiKey: configuration.client_id}
    const queryResult: GetConfigQuerySchema = await partnersRequest(GetConfig, token, queryVariables)

    if (!queryResult.app) abort("Couldn't find app. Make sure you have a valid client ID.")

    const {app} = queryResult

    const variables = getMutationVars(app, configuration)

    const result: PushConfigSchema = await partnersRequest(PushConfig, token, variables)

    if (result.appUpdate.userErrors.length > 0) {
      const errors = result.appUpdate.userErrors
        .map((error) => {
          const [_, ...fieldPath] = error.field || []
          const mappedName = FIELD_NAMES[fieldPath.join(',')] || fieldPath.join(', ')
          const fieldName = mappedName ? `${mappedName}: ` : ''
          return `${fieldName}${error.message}`
        })
        .join('\n')
      abort(errors)
    }

    const shouldDeleteScopes =
      app.requestedAccessScopes &&
      (configuration.access_scopes?.scopes === undefined || usesLegacyScopesBehavior(configuration))

    if (shouldDeleteScopes) {
      const clearResult: ClearScopesSchema = await partnersRequest(clearRequestedScopes, token, {apiKey: app.apiKey})

      if (clearResult.appRequestedAccessScopesClear?.userErrors?.length > 0) {
        const errors = clearResult.appRequestedAccessScopesClear.userErrors.map((error) => error.message).join(', ')
        abort(errors)
      }
    }

    if (!configuration.app_proxy && app.appProxy) {
      const deleteResult: DeleteAppProxySchema = await partnersRequest(deleteAppProxy, token, {apiKey: app.apiKey})

      if (deleteResult?.userErrors?.length > 0) {
        const errors = deleteResult.userErrors.map((error) => error.message).join(', ')
        abort(errors)
      }
    }

    renderSuccess({
      headline: `Updated your app config for ${configuration.name}`,
      body: [`Your ${configFileName} config is live for your app users.`],
    })
  }
}

const getMutationVars = (app: App, configuration: CurrentAppConfiguration) => {
  const variables: PushConfigVariables = {
    apiKey: configuration.client_id,
    title: configuration.name,
    applicationUrl: configuration.application_url,
    webhookApiVersion: configuration.webhooks?.api_version,
    redirectUrlAllowlist: configuration.auth?.redirect_urls ?? null,
    embedded: configuration.embedded ?? app.embedded,
    gdprWebhooks: {
      customerDeletionUrl: configuration.webhooks?.privacy_compliance?.customer_deletion_url ?? undefined,
      customerDataRequestUrl: configuration.webhooks?.privacy_compliance?.customer_data_request_url ?? undefined,
      shopDeletionUrl: configuration.webhooks?.privacy_compliance?.shop_deletion_url ?? undefined,
    },
    posEmbedded: configuration.pos?.embedded ?? false,
    preferencesUrl: configuration.app_preferences?.url ?? null,
  }

  if (!usesLegacyScopesBehavior(configuration) && configuration.access_scopes?.scopes !== undefined) {
    variables.requestedAccessScopes = getAppScopesArray(configuration)
  }

  if (configuration.app_proxy) {
    variables.appProxy = {
      proxySubPath: configuration.app_proxy.subpath,
      proxySubPathPrefix: configuration.app_proxy.prefix,
      proxyUrl: configuration.app_proxy.url,
    }
  }

  return variables
}

export const abort = (errorMessage: OutputMessage) => {
  throw new AbortError(errorMessage)
}
