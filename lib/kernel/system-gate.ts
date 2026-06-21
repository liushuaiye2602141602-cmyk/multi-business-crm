import { AsyncLocalStorage } from "node:async_hooks";

export const EXECUTION_KERNEL_SOURCE = "EXECUTION_KERNEL";

type WriteScope = {
  source: string;
  actionType?: string;
};

const writeScope = new AsyncLocalStorage<WriteScope>();

export function assertKernelWrite(source: string) {
  if (source !== EXECUTION_KERNEL_SOURCE) {
    throw new Error("[KERNEL_VIOLATION] Direct DB write detected from: " + source);
  }
}

export function currentKernelWriteSource(): string | null {
  return writeScope.getStore()?.source || null;
}

export function currentKernelActionType(): string | undefined {
  return writeScope.getStore()?.actionType;
}

export function withKernelWriteScope<T>(actionType: string, fn: () => Promise<T> | T): Promise<T> | T {
  return writeScope.run({ source: EXECUTION_KERNEL_SOURCE, actionType }, fn);
}

export function isKernelWriteScopeActive(): boolean {
  return currentKernelWriteSource() === EXECUTION_KERNEL_SOURCE;
}
