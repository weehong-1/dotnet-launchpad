# Validation failures are built through a static abstract factory, not reflection

The validation pipeline must return a failed result of the exact response type (`Result` or `Result<T>`) without knowing `T`. The original Boilerplate did this with reflection (`GetMethod` + `MakeGenericMethod`), which only fails at runtime, the first time validation fails, and breaks the build if trimming or AOT is ever enabled under warnings-as-errors. We added `IResultFactory<TSelf>` to the Domain with a single `static abstract TSelf CreateFailure(Error error)`, implemented explicitly by `Result` and `Result<T>`, and constrained the pipeline with `TResponse : Result, IResultFactory<TResponse>`. The interface only creates failures: success needs a value for `Result<T>` and none for `Result`, so there is no shared signature.

## Considered Options

- **Reflection, cached once per type plus a unit test**: kept the runtime lookup and the trimming problem.
- **Throw `ValidationException` and map it to 400 in the global exception handler**: rejected. Expected failures must be Results (spec 8.14), and the logging and operation audit pipelines would record validation failures as exceptions instead of failures.

## Consequences

A response type that does not implement the interface fails the pipeline's generic constraint, and Microsoft.Extensions.DependencyInjection then silently skips the behavior instead of failing. This is the same mechanism that already keeps validation off Queries, so it must stay covered by tests. The Boilerplate therefore includes a pipeline test (a real DI container with test-local fake Command and Query, asserting only the Command is validated) and an architecture test requiring every request handler to come through `ICommandHandler` or `IQueryHandler`. Everything else in `Result`, `Result<T>` and the pipeline stays as it was: the invalid-state guard, the implicit conversions, the unsealed `Result<T>`, the `IBaseCommand` constraint, and mapping FluentValidation failures to `Error` inside Application so the Domain never references FluentValidation.
