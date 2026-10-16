# A core Skeleton Solution, with everything else as add-ons in one Boilerplate

Boilerplate v1.0 had PostgreSQL, RabbitMQ with MassTransit, OIDC authentication and the deployment files built in, with only the Worker and Auditing optional. Readers who wanted to set up a .NET project with Clean Architecture, DDD and CQRS had to read past brokers, licenses, identity providers and VMs in every step, and could not run a test without Docker and a MassTransit license. We split the Boilerplate into a **core** (the four layers with the DDD and CQRS building blocks, Serilog and Seq, and tests that need no Docker) and six **add-ons** added after it, in this order: PostgreSQL, Messaging (needs PostgreSQL), Worker (needs Messaging), Auditing (needs PostgreSQL), Authentication and Go live. The Setup Flow covers only the core, 14 steps; each add-on has its own steps.

The code stays one Boilerplate. Add-on lines carry `@@flag` markers and add-on sections carry "(add-on: X)" in their headings, with the flags defined once in `src/data/addons.json`. The site, `TEMPLATE.md` and `scaffold.sh` all read the same Reference. The add-on pages show each changed file in full with the add-on's lines highlighted, computed from the markers.

## Considered Options

- **Split only the docs**: rejected. The core would still pull in EF Core, MassTransit and JwtBearer, and its tests would still need Docker and the MassTransit license.
- **A separate Boilerplate per add-on**: rejected. Files such as `Program.cs` and `DependencyInjection.cs` would exist in several copies that drift apart, and the scaffold generator could no longer read one Reference.
- **Scaffold patches that add an add-on to an existing project**: deferred. Patching files a project has already changed is fragile; the scaffold script takes add-on flags only for a new, empty repository, and the add-on pages give Manual and AI Agent routes.

## Consequences

- `scaffold.sh` builds the core by default; `--all` gives the v1.0 equivalent, and `--no-worker` / `--no-auditing` now fail with a message. This is Boilerplate v2.0.
- Core Done Conditions never depend on an add-on, so switching one on later does not reopen a finished core step.
- Projects saved under v1.0 are upgraded on load with PostgreSQL, Messaging, Authentication and Go live switched on, and their ticks move to where the checks live now (`src/data/progress-migration.ts`). The `local-services` step was merged into `run-locally` and redirects there.
- A Worker without a broker is not supported: scheduled jobs without Messaging go in the Api or wait for Messaging.
