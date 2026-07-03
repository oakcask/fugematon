import test from "node:test";

export const isReviewTestProfile = process.env.FUGEMATON_TEST_PROFILE === "review";

export const reviewTest = (
  isReviewTestProfile
    ? test
    : (name: string, optionsOrFn?: unknown, _fn?: unknown) => {
        const skip = "review-required; set FUGEMATON_TEST_PROFILE=review to run this test";
        if (typeof optionsOrFn === "function" || optionsOrFn === undefined) {
          return test(name, { skip }, () => {});
        }
        return test(name, { ...(optionsOrFn as object), skip }, () => {});
      }
) as typeof test;
