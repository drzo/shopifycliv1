import {defineProvider} from '@shopify/cli-kit/plugins/tunnel'

export const TUNNEL_PROVIDER = 'ngrok'
export default defineProvider({name: TUNNEL_PROVIDER})
