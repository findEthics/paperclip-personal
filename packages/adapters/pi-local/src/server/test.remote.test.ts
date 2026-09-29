import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdapterExecutionTarget } from "@paperclipai/adapter-utils/execution-target";

const mocks = vi.hoisted(() => {
  const restoreWorkspace = vi.fn(async () => {});
  return {
    restoreWorkspace,
    ensureAdapterExecutionTargetDirectory: vi.fn(async () => {}),
    ensureAdapterExecutionTargetCommandResolvable: vi.fn(async () => {}),
    maybeRunSandboxInstallCommand: vi.fn(async () => null),
    runAdapterExecutionTargetProcess: vi.fn(async () => ({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: JSON.stringify({
        type: "agent_end",
        messages: [{ role: "assistant", content: "hello" }],
      }),
      stderr: "",
      pid: null,
      startedAt: new Date().toISOString(),
    })),
    describeAdapterExecutionTarget: vi.fn(() => "QA sandbox"),
    resolveAdapterExecutionTargetCwd: vi.fn((_target, configuredCwd, fallbackCwd) =>
      typeof configuredCwd === "string" && configuredCwd.length > 0
        ? configuredCwd
        : fallbackCwd,
    ),
    prepareAdapterExecutionTargetRuntime: vi.fn(async ({ target, assets }: {
      target: AdapterExecutionTarget;
      assets?: Array<{ key: string; localDir: string }>;
    }) => ({
      target,
      workspaceRemoteDir: "/remote/workspace/.paperclip-runtime/runs/test/workspace",
      runtimeRootDir: "/remote/workspace/.paperclip-runtime/runs/test/workspace/.paperclip-runtime/pi",
      assetDirs: Object.fromEntries((assets ?? []).map((asset) => [
        asset.key,
        `/remote/workspace/.paperclip-runtime/runs/test/workspace/.paperclip-runtime/pi/${asset.key}`,
      ])),
      additionalSourceDirs: {},
      additionalSourceFailures: [],
      workspaceSyncSnapshot: null,
      restoreWorkspace,
    })),
  };
});

vi.mock("@paperclipai/adapter-utils/execution-target", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/execution-target")>(
    "@paperclipai/adapter-utils/execution-target",
  );
  return {
    ...actual,
    ensureAdapterExecutionTargetDirectory: mocks.ensureAdapterExecutionTargetDirectory,
    ensureAdapterExecutionTargetCommandResolvable: mocks.ensureAdapterExecutionTargetCommandResolvable,
    maybeRunSandboxInstallCommand: mocks.maybeRunSandboxInstallCommand,
    runAdapterExecutionTargetProcess: mocks.runAdapterExecutionTargetProcess,
    describeAdapterExecutionTarget: mocks.describeAdapterExecutionTarget,
    resolveAdapterExecutionTargetCwd: mocks.resolveAdapterExecutionTargetCwd,
    prepareAdapterExecutionTargetRuntime: mocks.prepareAdapterExecutionTargetRuntime,
  };
});

import { testEnvironment } from "./test.js";

describe("Pi environment diagnostics", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stages configured providers for a remote probe and removes local config", async () => {
    const remoteTarget: AdapterExecutionTarget = {
      kind: "remote",
      transport: "sandbox",
      providerKey: "cloudflare",
      remoteCwd: "/remote/workspace",
      runner: {
        execute: async () => ({
          exitCode: 0,
          signal: null,
          timedOut: false,
          stdout: "",
          stderr: "",
          pid: null,
          startedAt: new Date().toISOString(),
        }),
      },
    };

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "pi_local",
      config: {
        command: "pi",
        model: "zllm-openai/openai/gpt-6-sol",
        env: {
          PAPERCLIP_PI_PROVIDERS: JSON.stringify({
            "zllm-openai": {
              baseUrl: "http://gateway.example/v1",
              apiKey: "fixture-key",
              api: "openai-completions",
              models: [{ id: "openai/gpt-6-sol", name: "GPT-6 Sol" }],
            },
          }),
        },
      },
      executionTarget: remoteTarget,
      environmentName: "QA sandbox",
    });

    expect(result.status).toBe("pass");
    expect(mocks.prepareAdapterExecutionTargetRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterKey: "pi",
        assets: [expect.objectContaining({ key: "agentConfig" })],
      }),
    );
    const probe = mocks.runAdapterExecutionTargetProcess.mock.calls[0] as unknown as
      | [string, AdapterExecutionTarget, string, string[], { cwd: string; env: Record<string, string> }]
      | undefined;
    expect(probe?.[1]).toMatchObject({
      remoteCwd: "/remote/workspace/.paperclip-runtime/runs/test/workspace",
    });
    expect(probe?.[4].cwd).toBe(
      "/remote/workspace/.paperclip-runtime/runs/test/workspace",
    );
    expect(probe?.[4].env.PI_CODING_AGENT_DIR).toBe(
      "/remote/workspace/.paperclip-runtime/runs/test/workspace/.paperclip-runtime/pi/agentConfig",
    );
    expect(probe?.[4].env.PAPERCLIP_PI_PROVIDERS).toBeUndefined();
    expect(mocks.restoreWorkspace).toHaveBeenCalledOnce();

    const runtimeCall = mocks.prepareAdapterExecutionTargetRuntime.mock.calls[0] as unknown as
      | [{ assets: Array<{ localDir: string }> }]
      | undefined;
    const localConfigDir = runtimeCall?.[0].assets[0]?.localDir;
    expect(localConfigDir).toBeTruthy();
    await expect(fs.access(path.join(localConfigDir!, "models.json"))).rejects.toThrow();
  });
});
