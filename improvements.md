# Issues

[x] Recent tasks error bug fix

[ ] pi and codex, claude code integration
- [x] Pi: allow setup to use the Pi configuration already available on the selected execution environment; require a successful hello probe and do not attach a provider key.
- [x] Pi: show models from the existing zLLM-enabled Pi profile even when a plugin writes warnings to stderr during model discovery.
- [ ] Claude Code and Codex: add explicit setup choices for authentication already available on the selected execution environment.
- Managed per-user authentication reuse across isolated environments is not part of this host-local rollout.

### Claude Code and Codex resume notes (2026-09-28)

- Scope decision pending: start with the local Paperclip host (lean default), or support selected remote environments too. Codex currently stages host credentials for remote runs, so a remote probe does not prove target-native login. If local-only, make local environment selection reachable before Connect and hide the choice for remote targets.
- Reuse the existing Connect wizard, `testAgentSetup`, and adapter CLI hello probes; do not add a connection type, credential import, endpoint, or schema. Keep managed connections unchanged. See `ui/src/components/new-agent/NewAgentSetup.tsx` and `ui/src/components/new-agent/AgentProviderConnection.tsx`.
- Require `claude_hello_probe_passed` or `codex_hello_probe_passed` before hire, including Finish without a prior test; invalidate proof on auth choice, model, or environment change. Probe the same CLI engine, effective environment, and auth mode used by the eventual run. Do not treat ACP readiness or a warning as proof.
- Codex: align the keyless local probe with the run's managed company `CODEX_HOME`; an ambient `OPENAI_API_KEY` can make the current probe pass while the keyless run uses different auth. Keyless agents share host credentials; per-agent homes are created for explicit keys only. See `packages/adapters/codex-local/src/server/test.ts`, `execute.ts`, and `server/src/routes/agents.ts`.
- Claude Code: an ambient `ANTHROPIC_API_KEY` can override subscription login. Surface that distinction rather than calling an API-key probe proof of subscription reuse. See `packages/adapters/claude-local/src/server/test.ts`.
- Verify no AI Connection, provider key, or secret is attached; failed/skipped/timed-out probes and changed selections block hire. Extend `ui/src/pages/NewAgent.test.tsx` and narrow adapter tests; update relevant adapter docs and run targeted checks before full PR-ready verification.

[] Project folder changes
- Make git optional for project folders; currently folders get created by agents are not able to run if the project is not a git folder
- Set local folder in a project configuration should let you choose a local folder by invoking finder (in macos); currently "choose" displays instructions to copy path and paste

[] Test sub agents and MCPs for Bob and pi agents
