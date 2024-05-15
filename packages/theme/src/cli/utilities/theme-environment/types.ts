import {AdminSession} from '@shopify/cli-kit/node/session'
import {Checksum, ThemeFileSystem} from '@shopify/cli-kit/node/themes/types'

/**
 * Defines an authentication session for the theme development server.
 *
 * The AdminSession powers all API interactions with the Assets API, while
 * storefrontToken and storefrontPassword enable interactions with the
 * Storefront API.
 *
 * This session supports extended durations which can exceed 1h,
 * and includes a field to track when the session was last refreshed.
 */
export interface DevServerSession extends AdminSession {
  /**
   * Token to authenticate section rendering API calls.
   */
  storefrontToken: string

  /**
   * Password for accessing password-protected stores.
   */
  storefrontPassword?: string

  /**
   * Timestamp marking when this session expires.
   */
  expiresAt: Date
}

/**
 * Maintains the state of local and remote assets in theme development server.
 */
export interface DevServerContext {
  /**
   * Authentication session for development server operations.
   */
  session: DevServerSession

  /**
   * Checksums of remote assets.
   */
  remoteChecksums: Checksum[]

  /**
   * File system tracking local theme assets.
   */
  localThemeFileSystem: ThemeFileSystem

  /**
   * Indicates if theme editor changes are periodically pulled to the local
   * theme.
   */
  themeEditorSync: boolean
}

/**
 * Context for rendering pages in the development server.
 *
 * Holds properties that modify and influence how pages are rendered using
 * different themes and settings, including section-specific rendering
 */
export interface DevServerRenderContext {
  /**
   * URL path to be rendered.
   */
  path: string

  /**
   * Theme identifier for rendering.
   */
  themeId: string

  /**
   * Query parameters to be used during rendering.
   */
  query: [string, string][]

  /**
   * Cookies to be used during rendering.
   */
  cookies: string

  /**
   * Optional identifier for rendering only a specific section.
   */
  sectionId?: string

  /**
   * Headers to be used in the rendering request.
   */
  headers: {[key: string]: string}

  /**
   * Custom sections content to replace during rendering.
   */
  sections: {[key: string]: string}
}
