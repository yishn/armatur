export class CircularDependencyError extends Error {
  constructor() {
    super("Circular dependency detected");
  }
}
