# .NET Launchpad Site

A bilingual Docusaurus site that walks one developer through setting up a new .NET 10 Clean Architecture backend, from an empty folder to a deployed skeleton, one step at a time, for each new project.

## Language

### Walking the setup

**Setup Flow**:
The single ordered sequence of Steps that takes a new project from nothing to ready-for-features.
_Avoid_: Walkthrough, tutorial, checklist (for the whole thing)

**Step**:
One unit of the Setup Flow: what to do now, and the Done Conditions that say it is finished.
_Avoid_: Task, stage, section

**Done Condition**:
A checkable statement on a Step that must be true before moving to the next Step.
_Avoid_: Acceptance criteria, exit criteria

**Progress**:
Which Done Conditions have been checked, recorded separately for each Project.
_Avoid_: Status, state

### The project being set up

**Project**:
One new backend being set up with the Setup Flow, identified by its Project Name.
_Avoid_: Solution (that is the .slnx), app

**Project Settings**:
The per-Project inputs that tailor the site's content: Project Name, Short Name, which Optional Components are included, and the Project Decisions.
_Avoid_: Config, options

**Project Name**:
The real name that replaces the `ProductName` placeholder in C# names, namespaces and projects (for example `Company.Product`).
_Avoid_: Solution name, product name

**Short Name**:
The lowercase name (`[a-z][a-z0-9-]*`, for example `product`) that replaces the `productname` placeholder in Linux accounts, paths, service names and database names.
_Avoid_: Lowercase name, slug, PROJECT_LOWER

**Optional Component**:
A part of the boilerplate a Project may leave out: currently the Worker and Auditing.
_Avoid_: Module, feature, plugin

**Project Decision**:
A choice made fresh for each Project during the Setup Flow, as opposed to one fixed for all Projects.
_Avoid_: Open decision, option

### The content

**Reference**:
The part of the site that holds the architecture specification, the boilerplate code and the decision record, which Steps link into for detail.
_Avoid_: Docs, manual, appendix

**Boilerplate**:
The generic code files every Project starts with, the same for all Projects apart from the Project Name and Optional Components.
_Avoid_: Template (reserved), starter code, scaffold

**Skeleton Solution**:
A Project's solution after the Boilerplate is in place and before any business feature exists; the Setup Flow's output.
_Avoid_: Template, starter solution, empty solution

**`dotnet new` Template**:
An installable `dotnet new` package that generates a Skeleton Solution in one command; built once, not per Project.
_Avoid_: Using "template" alone for anything else
