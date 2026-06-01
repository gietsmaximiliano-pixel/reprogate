import fs from "node:fs";
import net from "node:net";

function fail(message) {
  console.error(`SAFE_RUN_CHECK_FAILED ${message}`);
  process.exit(1);
}

function readOptional(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return undefined;
  }
}

function checkIdentity() {
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  const gid = typeof process.getgid === "function" ? process.getgid() : undefined;
  console.log(`uid=${uid}`);
  console.log(`gid=${gid}`);

  if (uid === 0) fail("container is running as root");
}

function checkHostEnvironment() {
  if (process.env.REPROGATE_SECRET_SMOKE) {
    fail("host environment variable REPROGATE_SECRET_SMOKE leaked into the container");
  }
  console.log("hostEnv=not-passed");
}

function checkWorkspaceReadOnly() {
  try {
    fs.writeFileSync("/workspace/.reprogate-write-test", "should not be writable");
    fail("workspace bind mount is writable");
  } catch {
    console.log("workspace=read-only");
  }
}

function checkTmpfsWritable() {
  fs.writeFileSync("/tmp/reprogate/smoke.txt", "ok");
  console.log("tmpfs=writable");
}

function checkResourceLimits() {
  const memoryLimit =
    readOptional("/sys/fs/cgroup/memory.max") ??
    readOptional("/sys/fs/cgroup/memory/memory.limit_in_bytes");
  const cpuMax = readOptional("/sys/fs/cgroup/cpu.max");
  const cpuQuota = readOptional("/sys/fs/cgroup/cpu/cpu.cfs_quota_us");
  const cpuPeriod = readOptional("/sys/fs/cgroup/cpu/cpu.cfs_period_us");

  console.log(`memoryLimit=${memoryLimit ?? "unavailable"}`);
  console.log(`cpuLimit=${cpuMax ?? `${cpuQuota ?? "unavailable"}/${cpuPeriod ?? "unavailable"}`}`);

  if (!memoryLimit || memoryLimit === "max" || Number(memoryLimit) > 536870912) {
    fail("memory limit is missing or above 512m");
  }

  if (cpuMax) {
    const [quota, period] = cpuMax.split(" ").map(Number);
    if (!quota || !period || quota / period > 1) fail("CPU limit is missing or above 1 CPU");
  } else if (cpuQuota && cpuPeriod) {
    const quota = Number(cpuQuota);
    const period = Number(cpuPeriod);
    if (quota < 1 || !period || quota / period > 1) fail("CPU limit is missing or above 1 CPU");
  } else {
    fail("CPU limit is unavailable");
  }
}

async function checkNetworkDisabled() {
  await new Promise((resolve) => {
    const socket = net.createConnection({ host: "93.184.216.34", port: 80, timeout: 1500 });
    socket.once("connect", () => fail("outbound network connection succeeded"));
    socket.once("error", () => {
      console.log("network=disabled");
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      console.log("network=disabled");
      resolve();
    });
  });
}

checkIdentity();
checkHostEnvironment();
checkWorkspaceReadOnly();
checkTmpfsWritable();
checkResourceLimits();
await checkNetworkDisabled();
console.log("safe-run smoke ok");
