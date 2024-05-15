import * as styles from './Extensions.module.scss'

// eslint-disable-next-line @shopify/strict-component-boundaries
import {QRCodeModal} from './components/QRCodeModal'
import en from './translations/en.json'
import {AppRow} from './components/AppRow/AppRow.js'
import {PostPurchaseExtensionRow} from './components/PostPurchaseExtensionRow'
import {PostPurchaseModal} from './components/PostPurchaseModal'
import {ExtensionPayload} from '@shopify/ui-extensions-server-kit'
import {useI18n} from '@shopify/react-i18n'
import {RefreshMinor, ViewMinor, HideMinor, MobileMajor} from '@shopify/polaris-icons'
import React, {useCallback, useMemo, useState} from 'react'
import {Action} from '@/components/Action'
import {ExtensionRow} from '@/sections/Extensions/components/ExtensionRow'
import {Checkbox} from '@/components/CheckBox'
import {useExtensionsInternal} from '@/sections/Extensions/hooks/useExtensionsInternal'

function getUuid({uuid}: {uuid: string}) {
  return uuid
}

export function Extensions() {
  const [i18n] = useI18n({
    id: 'Extensions',
    fallback: en,
  })
  const [selectedExtensionsSet, setSelectedExtensionsSet] = useState<Set<string>>(new Set())
  const {
    state: {extensions, app},
    refresh,
    show,
    hide,
    focus,
    unfocus,
    client: {
      options: {surface},
    },
  } = useExtensionsInternal()

  const allSelected = selectedExtensionsSet.size === extensions.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedExtensionsSet(new Set([]))
    } else {
      setSelectedExtensionsSet(new Set(extensions.map(getUuid)))
    }
  }

  const toggleSelect = useCallback((extension: ExtensionPayload) => {
    setSelectedExtensionsSet((set) => {
      // if delete === false, extension not selected; therefore select it instead
      if (!set.delete(extension.uuid)) set.add(extension.uuid)
      return new Set(set)
    })
  }, [])

  const selectedExtensions = useMemo(
    () => extensions.filter((extension) => selectedExtensionsSet.has(extension.uuid)),
    [extensions, selectedExtensionsSet],
  )

  const refreshSelectedExtensions = () => refresh(selectedExtensions)

  // This is really horrible
  // It's caused by the fact that updates to state in useExtensionsInternal re-renders EVERYTHING
  // All state in child components is lost
  // Ideally this would be rendered by the child
  const [activeMobileQRCodeExtension, setActiveMobileQRCodeExtension] = useState<ExtensionPayload>()
  const [activePostPurchaseExtension, setActivePostPurchaseExtension] = useState<ExtensionPayload>()

  const actionHeaderMarkup = useMemo(() => {
    if (!selectedExtensions.length) return null

    const selectedExtensionsVisible: boolean =
      selectedExtensions.findIndex((extension) => !extension.development.hidden) !== -1

    return (
      <>
        {toggleViewAction()}
        <Action className={styles.Hidden} source={MobileMajor} accessibilityLabel="" onAction={() => null} />
      </>
    )

    function toggleViewAction() {
      return selectedExtensionsVisible ? (
        <Action
          source={ViewMinor}
          accessibilityLabel={i18n.translate('bulkActions.hide')}
          onAction={() => hide(selectedExtensions)}
        />
      ) : (
        <Action
          source={HideMinor}
          accessibilityLabel={i18n.translate('bulkActions.show')}
          onAction={() => show(selectedExtensions)}
        />
      )
    }
  }, [selectedExtensions, show, hide, i18n])

  const ConsoleContent = () => (
    <section className={styles.ExtensionList}>
      <table>
        <thead>
          <tr>
            <th>
              <Checkbox
                label={
                  allSelected ? i18n.translate('bulkActions.deselectAll') : i18n.translate('bulkActions.selectAll')
                }
                checked={allSelected}
                onChange={toggleSelectAll}
                labelHidden
              />
            </th>
            <th>{i18n.translate('extensionList.name')}</th>
            <th>{i18n.translate('extensionList.type')}</th>
            <th>{i18n.translate('extensionList.status')}</th>
            <th>
              <div className={styles.ActionGroup}>
                {actionHeaderMarkup}
                <Action
                  source={RefreshMinor}
                  accessibilityLabel={i18n.translate('extensionList.refresh')}
                  onAction={refreshSelectedExtensions}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {app ? <AppRow url={app.url} title={app.title} apiKey={app.apiKey} /> : null}
          {extensions.map((extension) => {
            const uuid = extension.uuid

            if (extension.type === 'checkout_post_purchase') {
              return (
                <PostPurchaseExtensionRow
                  key={uuid}
                  extension={extension}
                  onSelect={toggleSelect}
                  selected={selectedExtensionsSet.has(uuid)}
                  onHighlight={focus}
                  onClearHighlight={unfocus}
                  onShowInstructionsModal={setActivePostPurchaseExtension}
                />
              )
            }

            return (
              <ExtensionRow
                key={uuid}
                extension={extension}
                onSelect={toggleSelect}
                selected={selectedExtensionsSet.has(uuid)}
                onHighlight={focus}
                onClearHighlight={unfocus}
                onCloseMobileQRCode={() => setActiveMobileQRCodeExtension(undefined)}
                onShowMobileQRCode={setActiveMobileQRCodeExtension}
              />
            )
          })}
        </tbody>
      </table>
    </section>
  )

  const ConsoleEmpty = () => {
    return (
      <div className={styles.Empty}>
        {surface ? i18n.translate('errors.noExtensionsForSurface', {surface}) : i18n.translate('errors.noExtensions')}
      </div>
    )
  }

  return (
    <>
      {extensions.length > 0 ? <ConsoleContent /> : <ConsoleEmpty />}
      <QRCodeModal
        extension={activeMobileQRCodeExtension}
        open={activeMobileQRCodeExtension !== undefined}
        onClose={() => setActiveMobileQRCodeExtension(undefined)}
      />
      <PostPurchaseModal
        onClose={() => setActivePostPurchaseExtension(undefined)}
        extension={activePostPurchaseExtension}
      />
    </>
  )
}
