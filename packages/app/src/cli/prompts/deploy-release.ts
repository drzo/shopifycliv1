import {buildDeployReleaseInfoTableSection} from './ui/deploy-release-info-table-section.js'
import metadata from '../metadata.js'
import {
  ConfigExtensionIdentifiersBreakdown,
  ExtensionIdentifierBreakdownInfo,
  ExtensionIdentifiersBreakdown,
} from '../services/context/breakdown-extensions.js'
import {useVersionedAppConfig} from '@shopify/cli-kit/node/context/local'
import {InfoTableSection, renderConfirmationPrompt, renderDangerousConfirmationPrompt} from '@shopify/cli-kit/node/ui'

export interface DeployOrReleaseConfirmationPromptOptions {
  extensionIdentifiersBreakdown: ExtensionIdentifiersBreakdown
  configExtensionIdentifiersBreakdown?: ConfigExtensionIdentifiersBreakdown
  appTitle?: string
  release: boolean
  force: boolean
}

export interface DeployConfirmationPromptOptions {
  appTitle?: string
  extensionsContentPrompt: {
    extensionsInfoTable?: InfoTableSection
    hasDeletedExtensions: boolean
  }
  configContentPrompt: {
    configInfoTable: InfoTableSection
  }
  release: boolean
}

export async function deployOrReleaseConfirmationPrompt({
  force,
  extensionIdentifiersBreakdown,
  configExtensionIdentifiersBreakdown,
  appTitle,
  release,
}: DeployOrReleaseConfirmationPromptOptions) {
  if (force) return true
  const extensionsContentPrompt = await buildExtensionsContentPrompt(extensionIdentifiersBreakdown)
  const configContentPrompt = await buildConfigContentPrompt(release, configExtensionIdentifiersBreakdown)

  return deployConfirmationPrompt({
    appTitle,
    extensionsContentPrompt,
    configContentPrompt,
    release,
  })
}

async function deployConfirmationPrompt({
  appTitle,
  extensionsContentPrompt: {extensionsInfoTable, hasDeletedExtensions},
  configContentPrompt: {configInfoTable},
  release,
}: DeployConfirmationPromptOptions): Promise<boolean> {
  const timeBeforeConfirmationMs = new Date().valueOf()
  let confirmationResponse = true

  const infoTable = []
  if ((extensionsInfoTable || configInfoTable.items.length > 0) && useVersionedAppConfig()) {
    infoTable.push(
      configInfoTable.items.length === 0
        ? {...configInfoTable, emptyItemsText: 'No changes', items: []}
        : configInfoTable,
    )
  }
  const isDangerous = appTitle !== undefined && hasDeletedExtensions
  if (extensionsInfoTable)
    infoTable.push(
      isDangerous
        ? {...extensionsInfoTable, helperText: 'Removing extensions can permanentely delete app user data'}
        : extensionsInfoTable,
    )

  const question = `${release ? 'Release' : 'Create'} a new version${appTitle ? ` of ${appTitle}` : ''}?`
  if (isDangerous) {
    confirmationResponse = await renderDangerousConfirmationPrompt({
      message: question,
      infoTable,
      confirmation: appTitle,
    })
  } else {
    confirmationResponse = await renderConfirmationPrompt({
      message: question,
      infoTable,
      confirmationMessage: `Yes, ${release ? 'release' : 'create'} this new version`,
      cancellationMessage: 'No, cancel',
    })
  }

  const timeToConfirmOrCancelMs = new Date().valueOf() - timeBeforeConfirmationMs

  await metadata.addPublicMetadata(() => ({
    cmd_deploy_confirm_cancelled: !confirmationResponse,
    cmd_deploy_confirm_time_to_complete_ms: timeBeforeConfirmationMs,
  }))

  return confirmationResponse
}

async function buildExtensionsContentPrompt(extensionsContentBreakdown: ExtensionIdentifiersBreakdown) {
  const {onlyRemote, toCreate: toCreateBreakdown, toUpdate} = extensionsContentBreakdown

  const mapExtensionToInfoTableItem = (extension: ExtensionIdentifierBreakdownInfo, preffix: string) => {
    switch (extension.experience) {
      case 'dashboard':
        return [extension.title, {subdued: `(${preffix}from Partner Dashboard)`}]
      case 'extension':
        return extension.title
    }
  }
  let extensionsInfoTable
  const section = {
    new: toCreateBreakdown.map((extension) => mapExtensionToInfoTableItem(extension, 'new, ')),
    updated: toUpdate.map((extension) => mapExtensionToInfoTableItem(extension, '')),
    removed: onlyRemote.map((extension) => mapExtensionToInfoTableItem(extension, 'removed, ')),
  }
  const extensionsInfo = buildDeployReleaseInfoTableSection(section)

  const hasDeletedExtensions = onlyRemote.length > 0
  if (extensionsInfo.length > 0) {
    extensionsInfoTable = {
      header: 'Extensions:',
      items: extensionsInfo,
    }
  }

  await metadata.addPublicMetadata(() => ({
    cmd_deploy_confirm_new_registrations: toCreateBreakdown.length,
    cmd_deploy_confirm_updated_registrations: toUpdate.length,
    cmd_deploy_confirm_removed_registrations: onlyRemote.length,
  }))

  return {extensionsInfoTable, hasDeletedExtensions}
}

async function buildConfigContentPrompt(
  release: boolean,
  configContentBreakdown?: ConfigExtensionIdentifiersBreakdown,
) {
  if (!configContentBreakdown)
    return {
      configInfoTable: {header: 'Configuration: ', items: []},
      deletedInfoTable: undefined,
    }

  const {existingFieldNames, existingUpdatedFieldNames, newFieldNames, deletedFieldNames} = configContentBreakdown

  const section = {
    new: newFieldNames,
    updated: [...existingUpdatedFieldNames, ...existingFieldNames],
    removed: deletedFieldNames,
  }
  const configurationInfo = buildDeployReleaseInfoTableSection(section)

  const hasModifiedFields = newFieldNames.length > 0 || existingUpdatedFieldNames.length > 0
  const configInfoTable = {
    header: 'Configuration:',
    items: hasModifiedFields || deletedFieldNames.length > 0 || !release ? configurationInfo : [],
  }

  return {configInfoTable}
}
