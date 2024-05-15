import {gql} from 'graphql-request'

export const AppVersionByTagQuery = gql`
  query AppVersionByTag($apiKey: String!, $versionTag: String!) {
    app(apiKey: $apiKey) {
      deployment(versionTag: $versionTag) {
        id
        uuid
        versionTag
        location
        message
      }
    }
  }
`

interface ErrorDetail {
  extension_id: number
  extension_title: string
}

export interface AppVersionByTagSchema {
  app: {
    deployment: {
      id: number
      uuid: string
      versionTag: string
      location: string
      message: string
    }
  }
}
