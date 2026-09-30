export default class ExitReporter {
  onEnd(result) {
    const exitCode = result.status === "passed" ? 0 : 1;
    setTimeout(() => {
      process.exit(exitCode);
    }, 0).unref();
  }
}
