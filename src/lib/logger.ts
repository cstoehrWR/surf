type LogPayload = Record<string, unknown>;

function write(level: string, message: string, payload?: LogPayload) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...payload,
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  info: (message: string, payload?: LogPayload) => write("info", message, payload),
  warn: (message: string, payload?: LogPayload) => write("warn", message, payload),
  error: (message: string, payload?: LogPayload) => write("error", message, payload),
};
