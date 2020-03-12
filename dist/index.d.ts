import { TsConfigJson } from 'type-fest';
/**
 * The reason that the tsconfig exist flag is false.
 */
export declare const TsConfigErrorReason: {
    /**
     * The `tsconfig` file could not be found.
     */
    readonly NotFound: "not-found";
    /**
     * The file was found but the configuration was invalid.
     */
    readonly InvalidConfig: "invalid-config";
};
interface TsConfigFailure {
    /**
     * Whether or not the configuration could be loaded.
     *
     * - `false` when no tsconfig could be found.
     */
    exists: false;
    /**
     * The configuration object.
     *
     * - `undefined` when the tsconfig resolver failed and no configuration was
     *   found.
     */
    config?: undefined;
}
export interface TsConfigFailureNotFound extends TsConfigFailure {
    /**
     * The reason for failure.
     *
     * - `TsConfigErrorReason.NotFound` when the config failure is because the
     *   filename has not been found.
     */
    reason: typeof TsConfigErrorReason.NotFound;
    /**
     * The absolute path to the `tsconfig.json` or given filename.
     *
     * - `undefined` when not found.
     */
    path?: undefined;
}
export interface TsConfigFailureInvalidConfig extends TsConfigFailure {
    /**
     * - `TsConfigErrorReason.InvalidConfig` when the config failure is because of
     *   an invalid config.
     */
    reason: typeof TsConfigErrorReason.InvalidConfig;
    /**
     * - `string` when config json is invalid.
     */
    path: string;
}
export interface TsConfigResultSuccess {
    /**
     * - `true` when a valid tsconfig file has been found and successfully loaded.
     */
    exists: true;
    /**
     * - `string` when a valid tsconfig has been loaded.
     */
    path: string;
    /**
     * - `TsConfigJson` when the resolved tsconfig has been found and loaded.
     */
    config: TsConfigJson;
    /**
     * - `undefined` when no failure has occurred.
     */
    reason?: undefined;
}
/**
 * The result of loading the tsconfig. If the exists property is `true` then
 * there will be a path and config property available.
 */
export declare type TsConfigResult = TsConfigFailureNotFound | TsConfigFailureInvalidConfig | TsConfigResultSuccess;
export interface TsConfigLoaderParams {
    getEnv: (key: string) => string | undefined;
    cwd: string;
    loadSync?(cwd: string, fileName?: string): TsConfigResult;
}
export interface TsConfigResolverOptions {
    /**
     * The absolute directory to start resolving from.
     *
     * @default `process.cwd()`
     */
    cwd?: string;
    /**
     * The fileName to use.
     *
     * @default 'tsconfig.json'
     */
    fileName?: string;
    /**
     * The caching strategy to use.
     *
     * @default 'never'
     *
     * @remarks
     *
     * Sometimes you'll want to run this module several times during runtime but
     * it can be slow and expensive walk up the file tree for the tsconfig value
     * every time.
     *
     * To help prevent unnecessary lookups there are custom caching strategies
     * available. See {@link CacheStrategy}.
     */
    cacheStrategy?: CacheStrategyType;
}
export declare const CacheStrategy: {
    /**
     * Caching never happens and the returned value is always recalculated.
     */
    readonly Never: "never";
    /**
     * The first time the `tsconfigResolver` method is run it will save a cached
     * value (by `fileName`) which will be returned every time after that. This
     * value will always be the same.
     */
    readonly Always: "always";
    /**
     * The cache will be used when the same directory (and fileName) is being
     * searched.
     */
    readonly Directory: "directory";
};
/**
 * The available cache strategies as a union of strings.
 */
export declare type CacheStrategyType = typeof CacheStrategy[keyof typeof CacheStrategy];
/**
 * Resolve the `tsconfig` file synchronously. Walks up the file tree until it
 * finds a file that matches the fileName.
 *
 * @param options - `TsConfigResolverOptions`.
 *
 * @returns an object containing whether a configuration was found and is valid.
 *
 * @remarks
 *
 * If a none default caching strategy is provided the returned result might be
 * from the cache instead.
 */
export declare function tsconfigResolver({ cwd, cacheStrategy, fileName, }?: TsConfigResolverOptions): TsConfigResult;
/**
 * Clears the cache.
 */
export declare const clearCache: () => void;
export {};
//# sourceMappingURL=index.d.ts.map