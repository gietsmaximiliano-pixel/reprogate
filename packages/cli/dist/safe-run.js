import path from "node:path";
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
const dockerCommandRunner = 'const{spawn}=require("node:child_process");const t=Number(process.argv[1]);const c=JSON.parse(process.argv[2]);if(!Number.isInteger(t)||t<1){console.error("Invalid ReproGate timeout.");process.exit(125)}if(!Array.isArray(c)||c.length===0||c.some(function(p){return typeof p!=="string"})){console.error("Invalid ReproGate command.");process.exit(125)}const child=spawn(c[0],c.slice(1),{stdio:"inherit",detached:true});let timedOut=false;function killGroup(signal){try{process.kill(-child.pid,signal)}catch{try{child.kill(signal)}catch{}}}const timer=setTimeout(function(){timedOut=true;console.error("ReproGate safe-run timed out after "+t+" seconds.");killGroup("SIGTERM");setTimeout(function(){killGroup("SIGKILL")},2000).unref()},t*1000);child.on("error",function(error){clearTimeout(timer);console.error(error.message);process.exit(127)});child.on("exit",function(code,signal){clearTimeout(timer);if(timedOut)process.exit(124);if(typeof code==="number")process.exit(code);console.error("ReproGate safe-run command ended with signal "+(signal||"unknown")+"." );process.exit(1)});';
export function assertSafeCommand(command) {
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
export function parseCommandWords(command) {
    const words = [];
    let current = "";
    let quote;
    for (const character of command.trim()) {
        if (quote) {
            if (character === quote) {
                quote = undefined;
            }
            else {
                current += character;
            }
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }
        if (/\s/.test(character)) {
            if (current.length > 0) {
                words.push(current);
                current = "";
            }
            continue;
        }
        current += character;
    }
    if (quote) {
        throw new Error("Unsafe command rejected: Unterminated quoted argument.");
    }
    if (current.length > 0)
        words.push(current);
    if (words.length === 0)
        throw new Error("Command cannot be empty.");
    return words;
}
function assertSafeResourceOptions(options) {
    if (!Number.isInteger(options.timeoutSeconds) ||
        options.timeoutSeconds < 1 ||
        options.timeoutSeconds > 3600) {
        throw new Error("Timeout must be an integer between 1 and 3600 seconds.");
    }
    if (!/^(?:0\.[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/.test(options.cpus)) {
        throw new Error("CPU limit must be a positive numeric Docker --cpus value.");
    }
    if (!/^[1-9]\d*(?:[bkmgBKMG])?$/.test(options.memory)) {
        throw new Error("Memory limit must be a positive Docker memory value, for example 512m.");
    }
}
function quoteForDisplay(value) {
    if (/^[A-Za-z0-9_./:=@-]+$/.test(value))
        return value;
    return `"${value.replaceAll('"', '\\"')}"`;
}
export function buildDockerSafeRunInvocations(options) {
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
        const commandWords = parseCommandWords(command);
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
            "node",
            "-e",
            dockerCommandRunner,
            String(timeoutSeconds),
            JSON.stringify(commandWords)
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
//# sourceMappingURL=safe-run.js.map