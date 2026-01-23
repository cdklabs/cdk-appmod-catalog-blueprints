import { App, AppProps } from 'aws-cdk-lib';

/**
 * Default context for test Apps that skips bundling.
 *
 * Setting BUNDLING_STACKS to an empty array tells CDK to skip
 * bundling (esbuild/Docker) for all stacks during synthesis.
 * This significantly speeds up unit tests since bundling is
 * typically already tested separately.
 *
 * @see https://dev.to/aws-heroes/aws-cdk-unit-testing-advanced-tips-aligning-feature-flags-and-skipping-bundling-1fbk
 */
export const TEST_CONTEXT = {
  /**
   * Skip bundling for all stacks during tests.
   * This prevents esbuild/Docker bundling which can be slow.
   */
  'aws:cdk:bundling-stacks': [],
};

/**
 * Creates a CDK App configured for testing with bundling disabled.
 *
 * Use this instead of `new App()` in tests to skip Lambda bundling
 * and significantly speed up test execution.
 *
 * @example
 * ```typescript
 * import { createTestApp } from '../../test-utils';
 *
 * describe('MyConstruct', () => {
 *   let app: App;
 *   let stack: Stack;
 *
 *   beforeEach(() => {
 *     app = createTestApp();
 *     stack = new Stack(app, 'TestStack');
 *   });
 * });
 * ```
 *
 * @param props - Additional App props to merge with test defaults
 * @returns A CDK App configured for fast testing
 */
export function createTestApp(props?: AppProps): App {
  return new App({
    ...props,
    context: {
      ...TEST_CONTEXT,
      ...props?.context,
    },
  });
}
