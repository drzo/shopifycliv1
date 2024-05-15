# frozen_string_literal: true

require "shopify_cli/theme/dev_server/local_assets"

module ShopifyCLI
  module Theme
    module Extension
      class DevServer < ShopifyCLI::Theme::DevServer
        class LocalAssets < ShopifyCLI::Theme::DevServer::LocalAssets
          SUPPORTED_EXTENSIONS = [:js, :css].join("|")
          TAE_ASSET_REGEX = %r{(http:|https:)?//cdn\..*?(shopify\.com|spin\.dev)(/[^/]+)*?/extensions/.+?/(assets/.+?\.(?:#{SUPPORTED_EXTENSIONS}))}

          private

          def replace_asset_urls(body)
            replaced_body = body.join.gsub(TAE_ASSET_REGEX) do |match|
              path = Regexp.last_match[4]
              if @target.static_asset_paths.include?(path)
                "/#{path}"
              else
                match
              end
            end

            [replaced_body]
          end
        end
      end
    end
  end
end
