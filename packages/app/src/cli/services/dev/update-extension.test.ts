import {updateExtensionConfig, updateExtensionDraft} from './update-extension.js'
import {ExtensionUpdateDraftMutation} from '../../api/graphql/update_draft.js'
import {testUIExtension} from '../../models/app/app.test-data.js'
import {findSpecificationForConfig, parseConfigurationFile} from '../../models/app/loader.js'
import {loadLocalExtensionsSpecifications} from '../../models/extensions/load-specifications.js'
import {partnersRequest} from '@shopify/cli-kit/node/api/partners'
import {inTemporaryDirectory, mkdir, writeFile} from '@shopify/cli-kit/node/fs'
import {outputDebug} from '@shopify/cli-kit/node/output'
import {describe, expect, vi, test} from 'vitest'
import {joinPath} from '@shopify/cli-kit/node/path'

vi.mock('@shopify/cli-kit/node/api/partners')
vi.mock('@shopify/cli-kit/node/output')
vi.mock('../../models/app/loader.js')

const token = 'mock-token'
const apiKey = 'mock-api-key'
const registrationId = 'mock-registration-id'
const stderr = {write: vi.fn()} as any

describe('updateExtensionDraft()', () => {
  test('updates draft successfully and outputs debug message', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const configuration = {
        runtime_context: 'strict',
        settings: {type: 'object'},
        type: 'web_pixel_extension',
      } as any

      const mockExtension = await testUIExtension({
        devUUID: '1',
        configuration,
        directory: tmpDir,
      })

      await mkdir(joinPath(tmpDir, 'dist'))

      vi.mocked(partnersRequest).mockResolvedValue({
        extensionUpdateDraft: {
          userErrors: [],
        },
      })

      await writeFile(mockExtension.outputPath, 'test content')

      await updateExtensionDraft({
        extension: mockExtension,
        token,
        apiKey,
        registrationId,
        stderr,
      })

      expect(partnersRequest).toHaveBeenCalledWith(ExtensionUpdateDraftMutation, token, {
        apiKey,
        context: undefined,
        registrationId,
        config:
          '{"runtime_context":"strict","runtime_configuration_definition":{"type":"object"},"serialized_script":"dGVzdCBjb250ZW50"}',
      })

      // Check if outputDebug is called with success message
      expect(outputDebug).toHaveBeenCalledWith(
        `Drafts updated successfully for extension: ${mockExtension.localIdentifier}`,
      )
    })
  })

  test('updates draft successfully when extension doesnt support esbuild', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const configuration = {
        production_api_base_url: 'url1',
        benchmark_api_base_url: 'url2',
        type: 'tax_calculation',
      } as any

      const mockExtension = await testUIExtension({
        devUUID: '1',
        configuration,
        directory: tmpDir,
      })

      await mkdir(joinPath(tmpDir, 'dist'))

      vi.mocked(partnersRequest).mockResolvedValue({
        extensionUpdateDraft: {
          userErrors: [],
        },
      })

      await updateExtensionDraft({
        extension: mockExtension,
        token,
        apiKey,
        registrationId,
        stderr,
      })

      expect(partnersRequest).toHaveBeenCalledWith(ExtensionUpdateDraftMutation, token, {
        apiKey,
        context: undefined,
        registrationId,
        config: '{"production_api_base_url":"url1","benchmark_api_base_url":"url2"}',
      })

      // Check if outputDebug is called with success message
      expect(outputDebug).toHaveBeenCalledWith(
        `Drafts updated successfully for extension: ${mockExtension.localIdentifier}`,
      )
    })
  })

  test('handles user errors with stderr message', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const mockExtension = await testUIExtension({
        devUUID: '1',
        directory: tmpDir,
        type: 'web_pixel_extension',
      })

      await mkdir(joinPath(tmpDir, 'dist'))

      vi.mocked(partnersRequest).mockResolvedValue({
        extensionUpdateDraft: {
          userErrors: [{message: 'Error1'}, {message: 'Error2'}],
        },
      })

      await writeFile(mockExtension.outputPath, 'test content')

      await updateExtensionDraft({
        extension: mockExtension,
        token,
        apiKey,
        registrationId,
        stderr,
      })

      expect(stderr.write).toHaveBeenCalledWith('Error while updating drafts: Error1, Error2')
    })
  })
})

describe('updateExtensionConfig()', () => {
  test('updates draft with new config', async () => {
    const specifications = await loadLocalExtensionsSpecifications()

    await inTemporaryDirectory(async (tmpDir) => {
      const configuration = {
        runtime_context: 'strict',
        settings: {type: 'object'},
        type: 'web_pixel_extension',
      } as any

      const mockExtension = await testUIExtension({
        devUUID: '1',
        configuration,
        directory: tmpDir,
      })

      await mkdir(joinPath(tmpDir, 'dist'))

      vi.mocked(partnersRequest).mockResolvedValue({
        extensionUpdateDraft: {
          userErrors: [],
        },
      })

      vi.mocked(findSpecificationForConfig).mockResolvedValue({} as any)
      vi.mocked(parseConfigurationFile).mockResolvedValue({
        runtime_context: 'strict',
        settings: {type: 'object', another: 'setting'},
        type: 'web_pixel_extension',
      } as any)

      await writeFile(mockExtension.outputPath, 'test content')

      await updateExtensionConfig({
        extension: mockExtension,
        token,
        apiKey,
        registrationId,
        stderr,
        specifications,
      })

      expect(partnersRequest).toHaveBeenCalledWith(ExtensionUpdateDraftMutation, token, {
        apiKey,
        context: undefined,
        registrationId,
        config:
          '{"runtime_context":"strict","runtime_configuration_definition":{"type":"object","another":"setting"},"serialized_script":"dGVzdCBjb250ZW50"}',
      })

      // Check if outputDebug is called with success message
      expect(outputDebug).toHaveBeenCalledWith(
        `Drafts updated successfully for extension: ${mockExtension.localIdentifier}`,
      )
    })
  })
})
