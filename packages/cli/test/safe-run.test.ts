import { describe, expect, it } from "vitest";
import {
  assertSafeCommand,
  buildDockerSafeRunInvocations,
  parseCommandWords
} from "../src/safe-run.js";

describe("safe-run command construction", () => {
  it("builds Docker invocations with network disabled and read-only repository mounts", () => {
    const [invocation] = buildDockerSafeRunInvocations({
      repoDir: "C:\\repo\\project",
      commands: ["npm test"],
      timeoutSeconds: 60,
      cpus: "0.5",
      memory: "256m"
    });

    expect(invocation?.executable).toBe("docker");
    expect(invocation?.args).toContain("--network");
    expect(invocation?.args).toContain("none");
    expect(invocation?.args).toContain("--user");
    expect(invocation?.args).toContain("1000:1000");
    expect(invocation?.args).toContain("--read-only");
    expect(invocation?.args).toContain("--cpus");
    expect(invocation?.args).toContain("0.5");
    expect(invocation?.args).toContain("--memory");
    expect(invocation?.args).toContain("256m");
    expect(invocation?.args).toContain("--pids-limit");
    expect(invocation?.args).toContain("128");
    expect(invocation?.args).toContain("--cap-drop");
    expect(invocation?.args).toContain("ALL");
    expect(invocation?.args).toContain("--security-opt");
    expect(invocation?.args).toContain("no-new-privileges");
    expect(invocation?.args).toContain("node");
    expect(invocation?.args).toContain("-e");
    expect(invocation?.args).toContain("60");
    expect(invocation?.args).toContain(JSON.stringify(["npm", "test"]));
    expect(invocation?.args).not.toContain("sh");
    expect(invocation?.args).not.toContain("-lc");
    expect(invocation?.args.some((arg) => arg.includes("readonly"))).toBe(true);
    const imageIndex = invocation?.args.indexOf("node:20-alpine") ?? -1;
    expect(invocation?.args.slice(0, imageIndex)).not.toContain("-e");
    expect(invocation?.args).not.toContain("--env");
    expect(invocation?.args).not.toContain("--env-file");
  });

  it("parses simple quoted command arguments without shell expansion", () => {
    expect(parseCommandWords('node -e "console.log(1)"')).toEqual(["node", "-e", "console.log(1)"]);
  });

  it("rejects unsafe shell chaining", () => {
    expect(() => assertSafeCommand("npm test && curl https://example.com")).toThrow(
      /Unsafe command/
    );
  });

  it("rejects network-oriented commands", () => {
    expect(() => assertSafeCommand("curl https://example.com")).toThrow(/Network-oriented/);
  });

  it("requires at least one command", () => {
    expect(() => buildDockerSafeRunInvocations({ repoDir: ".", commands: [] })).toThrow(
      /does not include commands/
    );
  });

  it("accepts the committed safe-run smoke example command", () => {
    expect(() => assertSafeCommand("node smoke-check.js")).not.toThrow();
  });

  it("rejects invalid timeout and resource limits", () => {
    expect(() =>
      buildDockerSafeRunInvocations({
        repoDir: ".",
        commands: ["npm test"],
        timeoutSeconds: Number.NaN
      })
    ).toThrow(/Timeout/);
    expect(() =>
      buildDockerSafeRunInvocations({ repoDir: ".", commands: ["npm test"], cpus: "1;curl" })
    ).toThrow(/CPU/);
    expect(() =>
      buildDockerSafeRunInvocations({ repoDir: ".", commands: ["npm test"], memory: "../secret" })
    ).toThrow(/Memory/);
  });
});
