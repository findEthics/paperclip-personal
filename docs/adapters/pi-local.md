---
title: Pi
summary: Pi local adapter setup, provider configuration, and authentication
---

The `pi_local` adapter runs the Pi CLI on the selected execution environment.
New-agent setup offers **Existing Pi configuration** to test and use providers
and login already available to Pi there, without attaching an API key or creating
an AI Connection. The environment test runs a read-only hello probe and setup
cannot finish this way unless Pi returns a successful response.

## Prerequisites

- Pi CLI installed on the selected execution environment
- An authenticated Pi profile or provider API key available to that process
- A model ID in `provider/model` format that Pi can resolve

Use **API key or secret** in new-agent setup when the provider credential should
be stored as a Paperclip secret binding instead of using Pi's existing profile.
The existing-configuration choice does not import credentials into Paperclip.

## Provider configuration

Pi normally reads providers from its agent configuration directory. When
`PAPERCLIP_PI_PROVIDERS` is set, Paperclip materializes that JSON provider map
into a temporary `models.json` and points Pi at it for the run. This replaces
Pi's normal agent configuration directory for that invocation; it is not merged
with the Pi profile. For remote execution, Paperclip stages the generated
configuration, so configured provider endpoints must be reachable from the
selected environment. Treat any literal credentials in this provider map as
secrets.

## Sessions

Pi conversation sessions persist across heartbeats. Paperclip resumes a session
only when its working directory and execution target still match; otherwise it
starts a fresh session. Provider authentication and conversation-session reuse
are separate concerns.

## Environment test

The environment test checks the working directory and Pi command, discovers and
validates the selected model when running locally, then sends a read-only
`Respond with hello.` probe. Remote tests validate through the probe on the
selected target. Existing-configuration setup requires the `pi_hello_probe_passed`
result before creating the agent.
