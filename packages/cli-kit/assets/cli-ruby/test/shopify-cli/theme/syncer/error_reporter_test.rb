# frozen_string_literal: true

require "test_helper"
require "shopify_cli/theme/syncer"

module ShopifyCLI
  module Theme
    class Syncer
      class ErrorReporterTest < Minitest::Test
        def setup
          super
          @reporter = ErrorReporter.new(@context)
        end

        def test_report
          io = capture_io do
            @reporter.report("error 1")
            @reporter.report("error 2")
          end

          io_messages = io.join

          assert_match("error 1", io_messages)
          assert_match("error 2", io_messages)
        end

        def test_report_when_it_is_disabled
          @reporter.disable!

          before_enabling_errors = capture_io do
            @reporter.report("error 1")
            @reporter.report("error 2")
          end

          after_enabling_errors = capture_io do
            @reporter.enable!
            @reporter.report("error 3")
          end

          before_enabling_io = before_enabling_errors.join
          after_enabling_io = after_enabling_errors.join

          assert_empty(before_enabling_io)
          refute_empty(after_enabling_io)
          assert_match("error 1", after_enabling_io)
          assert_match("error 2", after_enabling_io)
          assert_match("error 3", after_enabling_io)
        end

        def test_has_any_error_when_no_error_was_reported
          refute(@reporter.has_any_error?)
        end

        def test_has_any_error_when_an_error_was_reported
          capture_io { @reporter.report("error 1") }
          assert(@reporter.has_any_error?)
        end
      end
    end
  end
end
