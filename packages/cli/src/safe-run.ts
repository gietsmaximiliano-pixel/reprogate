import path from "node:path";

export interface DockerSafeRunOptions {
  repoDir: string;
  commands: string[];
  image?: string;
  timeoutSeconds?: number;
  cpus?: string;
  memory?: string;
}

export interface DockerInvocation {
  executable: "docker";
  args: string[];
  displayCommand: string;
  originalCommand: string;
  timeoutSeconds: number;
}

const unsafeCommandPatterns = [
  { pattern: /[\0\r\n]/, reason: "Commands must be single-line." },
  { pattern: /[;&|<>`]/, reason: "Shell control operators and redirection are not allowed." },
  { pattern: /\$\(/, reason: "Command substitution is not allowed." },
  { pattern: /\b(?:sudo|su)\b/, reason: "Privilege escalation commands are not allowed." },
  {
    pattern: /\b(?:curl|wget|nc|netcat|ssh|scp|ftp)\b/,
    reason: "Network-oriented commands are not allowed."
  }
];

export function assertSafeCommand(command: string): void {
  const trimmed = command.trim();
  if (trimmed.length === 0) {
    throw new Error("Command cannot be empty.");
  }

  for (const { pattern, reason } of unsafeCommandPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`Unsafe command rejected: ${reason}`);
    }
  }
}

function assertSafeResourceOptions(options: {
  timeoutSeconds: number;
  cpus: string;
  memory: string;
}): void {
  if (
    !Number.isInteger(options.timeoutSeconds) ||
    options.timeoutSeconds < 1 ||
    options.timeoutSeconds > 3600
  ) {
    throw new Error("Timeout must be an integer between 1 and 3600 seconds.");
  }

  if (!/^(?:0\.[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/.test(options.cpus)) {
    throw new Error("CPU limit must be a positive numeric Docker --cpus value.");
  }

  if (!/^[1-9]\d*(?:[bkmgBKMG])?$/.test(options.memory)) {
    throw new Error("Memory limit must be a positive Docker memory value, for example 512m.");
  }
}

function quoteForDisplay(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `"${value.replaceAll('"', '\\"')}"`;
}

export function buildDockerSafeRunInvocations(options: DockerSafeRunOptions): DockerInvocation[] {
  const image = options.image ?? "node:20-alpine";
  const timeoutSeconds = options.timeoutSeconds ?? 120;
  const cpus = options.cpus ?? "1";
  const memory = options.memory ?? "512m";
  const repoDir = path.resolve(options.repoDir);

  assertSafeResourceOptions({ timeoutSeconds, cpus, memory });

  if (options.commands.length === 0) {
    throw new Error("Manifest does not include commands to verify.");
  }

  return options.commands.map((command) => {
    assertSafeCommand(command);

    const args = [
      "run",
      "--rm",
      "--network",
      "none",
      "--cpus",
      cpus,
      "--memory",
      memory,
      "--pids-limit",
      "128",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--user",
      "1000:1000",
      "--read-only",
      "--mount",
      `type=bind,source=${repoDir},target=/workspace,readonly`,
      "--mount",
      "type=tmpfs,target=/tmp/reprogate",
      "--workdir",
      "/workspace",
      image,
      "timeout",
      "-s",
      "TERM",
      String(timeoutSeconds),
      "sh",
      "-lc",
      command
    ];

    return {
      executable: "docker",
      args,
      displayCommand: ["docker", ...args].map(quoteForDisplay).join(" "),
      originalCommand: command,
      timeoutSeconds
    };
  });
}
