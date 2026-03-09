/**
 * __mocks__/posthog-react-native.ts
 *
 * Manual Jest mock for posthog-react-native.
 * PostHog uses a class-based API; this mock provides a constructable class
 * whose instance methods are all jest.fn() spies.
 */

/** Shared mock instance — exported so tests can make assertions on it. */
export const mockPostHogInstance = {
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  shutdown: jest.fn(),
};

/** Mock PostHog class. Constructor always returns the shared mockInstance. */
const PostHog = jest.fn().mockImplementation(() => mockPostHogInstance);

export default PostHog;
export { PostHog };
