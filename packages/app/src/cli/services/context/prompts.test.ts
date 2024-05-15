import {deployConfirmationPrompt, SourceSummary} from './prompts.js'
import {RemoteSource, LocalSource} from './identifiers.js'
import {IdentifiersExtensions} from '../../models/app/identifiers.js'
import {partnersRequest} from '@shopify/cli-kit/node/api/partners'
import {renderConfirmationPrompt, InfoTableSection} from '@shopify/cli-kit/node/ui'
import {describe, expect, test, vi} from 'vitest'

vi.mock('@shopify/cli-kit/node/ui')
vi.mock('@shopify/cli-kit/node/api/partners')

describe('deployConfirmationPrompt', () => {
  describe('when legacy deployment mode', () => {
    test('renders confirmation prompt with the source summary', async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)

      // When
      const response = await deployConfirmationPrompt(
        buildSourceSummary({
          identifiers: {...identifier1, ...identifier2},
          toCreate: [createdExtension],
          onlyRemote: [remoteOnlyExtension],
          dashboardOnly: [dashboardOnlyExtension],
        }),
        'legacy',
        'apiKey',
        'token',
      )

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(legacyRenderConfirmationPromptContent())
    })

    test("doesn't call renderConfirmationPrompt() when no extensions to deploy and infoTable is empty", async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)

      // When
      const response = await deployConfirmationPrompt(buildSourceSummary(), 'legacy', 'apiKey', 'token')

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).not.toHaveBeenCalled()
    })
  })

  describe('when unified deployment mode and app has an active version', () => {
    test('renders confirmation prompt with the comparison between source summary and active version', async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)
      vi.mocked(partnersRequest).mockResolvedValue(activeVersionContent())

      // When
      const response = await deployConfirmationPrompt(
        buildSourceSummary({
          identifiers: {...identifier1, ...identifier2},
          toCreate: [createdExtension],
          onlyRemote: [remoteOnlyExtension],
          dashboardOnly: [dashboardOnlyExtension],
        }),
        'unified',
        'apiKey',
        'token',
      )

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(
        unifiedRenderConfirmationPromptContent({
          infoTable: [
            {
              header: 'Includes:',
              items: [
                ['extension1', {subdued: '(new)'}],
                ['id1', {subdued: '(new)'}],
                'extension2',
                ['dashboard_title2', {subdued: '(from Partner Dashboard)'}],
              ],
              bullet: '+',
            },
            {
              header: 'Removes:',
              helperText: 'This can permanently delete app user data.',
              items: ['title3', 'dashboard_title1'],
              bullet: '-',
            },
          ],
        }),
      )
    })

    test('when current extension registration and active version include same dashboard extension we should show it only in the dashboard section', async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)
      vi.mocked(partnersRequest).mockResolvedValue(activeVersionContent())

      const dashboardExtensionIncludedInActiveVersion = {
        id: 'dashboard_id1',
        uuid: 'dashboard_uuid1',
        title: 'dashboard_title1',
        type: 'dashboard_type1',
      }

      // When
      const response = await deployConfirmationPrompt(
        buildSourceSummary({
          identifiers: {...identifier1, ...identifier2},
          toCreate: [createdExtension],
          onlyRemote: [remoteOnlyExtension],
          dashboardOnly: [dashboardOnlyExtension, dashboardExtensionIncludedInActiveVersion],
        }),
        'unified',
        'apiKey',
        'token',
      )

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(
        unifiedRenderConfirmationPromptContent({
          infoTable: [
            {
              header: 'Includes:',
              items: [
                ['extension1', {subdued: '(new)'}],
                ['id1', {subdued: '(new)'}],
                'extension2',
                ['dashboard_title2', {subdued: '(from Partner Dashboard)'}],
                ['dashboard_title1', {subdued: '(from Partner Dashboard)'}],
              ],
              bullet: '+',
            },
            {
              header: 'Removes:',
              helperText: 'This can permanently delete app user data.',
              items: ['title3'],
              bullet: '-',
            },
          ],
        }),
      )
    })

    test('when current dashboard extension registration and non dashboard active version include same extension we should show as new, not dashboard', async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)
      vi.mocked(partnersRequest).mockResolvedValue(activeVersionContent())
      // Add dashboard extension to the current non dashboard registrations
      const dashboardIdentifier = {dashboard_title2: 'dashboard_uuid2'}

      // When
      const response = await deployConfirmationPrompt(
        buildSourceSummary({
          identifiers: {...identifier1, ...identifier2, ...dashboardIdentifier},
          toCreate: [createdExtension],
          onlyRemote: [remoteOnlyExtension],
          dashboardOnly: [dashboardOnlyExtension],
        }),
        'unified',
        'apiKey',
        'token',
      )

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(
        unifiedRenderConfirmationPromptContent({
          infoTable: [
            {
              header: 'Includes:',
              items: [
                ['extension1', {subdued: '(new)'}],
                ['dashboard_title2', {subdued: '(new)'}],
                ['id1', {subdued: '(new)'}],
                'extension2',
              ],
              bullet: '+',
            },
            {
              header: 'Removes:',
              helperText: 'This can permanently delete app user data.',
              items: ['title3', 'dashboard_title1'],
              bullet: '-',
            },
          ],
        }),
      )
    })
  })

  describe("when unified deployment mode and app doesn't have an active version", () => {
    test('renders confirmation prompt with registered, unreleased CLI extensions as new extensions', async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)
      vi.mocked(partnersRequest).mockResolvedValue({app: {activeAppVersion: null}})

      // When
      const response = await deployConfirmationPrompt(
        buildSourceSummary({identifiers: {...identifier1}}),
        'unified',
        'apiKey',
        'token',
      )

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(
        unifiedRenderConfirmationPromptContent({
          infoTable: [
            {
              header: 'Includes:',
              items: [['extension1', {subdued: '(new)'}]],
              bullet: '+',
            },
          ],
        }),
      )
    })

    test("doesn't render registered CLI extension in Removes section of confirmation prompt when it's missing locally", async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)
      vi.mocked(partnersRequest).mockResolvedValue({app: {activeAppVersion: null}})

      // When
      const response = await deployConfirmationPrompt(
        buildSourceSummary({onlyRemote: [remoteOnlyExtension]}),
        'unified',
        'apiKey',
        'token',
      )

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(unifiedRenderConfirmationPromptContent({infoTable: []}))
    })

    test('renders confirmation prompt with empty infoTable when no changes are being released to users', async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)
      vi.mocked(partnersRequest).mockResolvedValue({app: {activeAppVersion: null}})

      // When
      const response = await deployConfirmationPrompt(buildSourceSummary(), 'unified', 'apiKey', 'token')

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(unifiedRenderConfirmationPromptContent({infoTable: []}))
    })

    test('renders confirmation prompt with empty infoTable when remote only extensions exist but are missing locally', async () => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true)
      vi.mocked(partnersRequest).mockResolvedValue({app: {activeAppVersion: null}})

      // When
      const response = await deployConfirmationPrompt(
        buildSourceSummary({onlyRemote: [remoteOnlyExtension]}),
        'unified',
        'apiKey',
        'token',
      )

      // Then
      expect(response).toBe(true)
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(unifiedRenderConfirmationPromptContent({infoTable: []}))
    })
  })
})

const identifier1 = {extension1: 'uuid1'}
const identifier2 = {extension2: 'uuid2'}
const createdExtension = {
  localIdentifier: 'id1',
  graphQLType: 'type1',
  type: 'type1',
  configuration: {name: 'name1'},
}
const remoteOnlyExtension = {
  id: 'remote_id1',
  uuid: 'remote_uuid1',
  title: 'remote_title1',
  type: 'remote_type1',
}
const dashboardOnlyExtension = {
  id: 'dashboard_id2',
  uuid: 'dashboard_uuid2',
  title: 'dashboard_title2',
  type: 'dashboard_type2',
}
interface BuildSourceSummaryOptions {
  identifiers?: IdentifiersExtensions
  toCreate?: LocalSource[]
  onlyRemote?: RemoteSource[]
  dashboardOnly?: RemoteSource[]
}

function buildSourceSummary(options: BuildSourceSummaryOptions = {}): SourceSummary {
  const {identifiers = {}, toCreate = [], onlyRemote = [], dashboardOnly = []} = options

  return {
    appTitle: undefined,
    question: 'question',
    identifiers,
    toCreate,
    onlyRemote,
    dashboardOnly,
  }
}

function legacyRenderConfirmationPromptContent(confirmationMessage = 'Yes, deploy to push changes') {
  return {
    cancellationMessage: 'No, cancel',
    confirmationMessage,
    infoTable: [
      {
        header: 'Includes:',
        items: [
          ['id1', {subdued: '(new)'}],
          'extension1',
          'extension2',
          ['dashboard_title2', {subdued: '(from Partner Dashboard)'}],
        ],
        bullet: '+',
      },
      {
        header: 'Removes:',
        items: ['remote_title1'],
        bullet: '-',
        helperText: 'This can permanently delete app user data.',
      },
    ],
    message: 'question',
  }
}

function activeVersionContent() {
  return {
    app: {
      activeAppVersion: {
        appModuleVersions: [
          {
            registrationId: 'id3',
            registrationUuid: 'uuid3',
            registrationTitle: 'title3',
            type: 'type3',
            specification: {
              identifier: 'spec1',
              name: 'specName1',
              options: {
                managementExperience: 'cli',
              },
            },
          },
          {
            registrationId: 'id2',
            registrationUuid: 'uuid2',
            registrationTitle: 'extension2',
            type: 'type2',
            specification: {
              identifier: 'spec3',
              name: 'specName3',
              options: {
                managementExperience: 'cli',
              },
            },
          },
          {
            registrationId: 'dashboard_id1',
            registrationUuid: 'dashboard_uuid1',
            registrationTitle: 'dashboard_title1',
            type: 'admin-link',
            specification: {
              identifier: 'spec2',
              name: 'specName2',
              options: {
                managementExperience: 'dashboard',
              },
            },
          },
        ],
      },
    },
  }
}

interface UnifiedRenderConfirmationPromptContentOptions {
  infoTable?: InfoTableSection[]
}

function unifiedRenderConfirmationPromptContent(options: UnifiedRenderConfirmationPromptContentOptions = {}) {
  const {infoTable} = options

  return {
    cancellationMessage: 'No, cancel',
    confirmationMessage: 'Yes, release this new version',
    infoTable,
    message: 'question',
  }
}
