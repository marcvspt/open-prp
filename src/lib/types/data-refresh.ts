export interface DataChangeDetail {
  module: string;
}

export type DataRefreshHandler = (signal: AbortSignal) => Promise<void>;
export type DataRefreshState = "loading" | "error" | "idle";
