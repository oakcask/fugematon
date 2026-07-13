import test from "node:test";

export const isReviewTestProfile = process.env.FUGEMATON_TEST_PROFILE === "review";
const reviewTestNamePrefix = "[review] ";
const namedTest = test as unknown as (name: string, optionsOrFn?: unknown, fn?: unknown) => unknown;

function formatReviewTestName(name: string): string {
  return name.startsWith(reviewTestNamePrefix) ? name : `${reviewTestNamePrefix}${name}`;
}

export const reviewTest = (
  isReviewTestProfile
    ? (name: string, optionsOrFn?: unknown, fn?: unknown) => {
        if (typeof optionsOrFn === "function" || optionsOrFn === undefined) {
          return namedTest(formatReviewTestName(name), optionsOrFn);
        }
        return namedTest(formatReviewTestName(name), optionsOrFn, fn);
      }
    : (name: string, optionsOrFn?: unknown, _fn?: unknown) => {
        const skip = "review-required; set FUGEMATON_TEST_PROFILE=review to run this test";
        if (typeof optionsOrFn === "function" || optionsOrFn === undefined) {
          return test(formatReviewTestName(name), { skip }, () => {});
        }
        return test(formatReviewTestName(name), { ...(optionsOrFn as object), skip }, () => {});
      }
) as typeof test;
