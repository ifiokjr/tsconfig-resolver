import { existsSync, lstatSync, readFileSync, statSync } from 'fs';
import JSON5 from 'json5';
import { dirname, join, resolve } from 'path';
import StripBom from 'strip-bom';
import { TsConfigJson, Except } from 'type-fest';
import path from 'path';

const DEFAULT_FILENAME = 'tsconfig.json';

interface IsNodeModuleRequireOptions {
  /**
   * Whether to simulate windows.
   *
   * @default undefined
   */
  windows?: boolean;
}

interface ParseFilePath {
  /**
   * True when the file path provided is an absolute path.
   */
  isAbsolute: boolean;

  /**
   * True when the file path potentially refers to a node module package.
   */
  isPackage: boolean;
}

/**
 * Extends the default node file parser and determines whether the path provided
 * should be resolved from the node modules or directly from the provided path.
 */
const parseFilePath = (
  file: string,
  { windows }: IsNodeModuleRequireOptions = {},
): path.ParsedPath & ParseFilePath => {
  const isWindows = windows ?? process.platform === 'win32';
  const parser = isWindows ? path.win32.parse : path.parse;
  const parsedPath = parser(file);

  return {
    ...parsedPath,
    isAbsolute: Boolean(parsedPath.root),
    isPackage: !file.startsWith('.') && !parsedPath.root,
  };
};

/**
 * The reason that the tsconfig exist flag is false.
 */
export const TsConfigErrorReason = {
  /**
   * The `tsconfig` file could not be found.
   */
  NotFound: 'not-found',

  /**
   * The file was found but the configuration was invalid.
   */
  InvalidConfig: 'invalid-config',
} as const;

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
export type TsConfigResult =
  | TsConfigFailureNotFound
  | TsConfigFailureInvalidConfig
  | TsConfigResultSuccess;

export interface TsConfigLoaderParams {
  getEnv: (key: string) => string | undefined;
  cwd: string;
  loadSync?(cwd: string, fileName?: string): TsConfigResult;
}

const walkForTsConfig = (directory: string): string | undefined => {
  const configPath = join(directory, './tsconfig.json');
  if (existsSync(configPath)) {
    return configPath;
  }

  const parentDirectory = join(directory, '../');

  // If we reached the top
  if (directory === parentDirectory) {
    return undefined;
  }

  return walkForTsConfig(parentDirectory);
};

/**
 * Check that the passed string is a directory.
 */
const isDirectory = (directory: string) => {
  try {
    return lstatSync(directory).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Check that the passed filePath is a valid file.
 */
const isFile = (filePath: string) => {
  try {
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveConfigPath = (
  cwd: string,
  fileName: string = DEFAULT_FILENAME,
): string | undefined => {
  if (fileName !== DEFAULT_FILENAME) {
    const resolvedFileName = resolve(cwd, fileName);
    const absolutePath = isDirectory(resolvedFileName)
      ? resolve(resolvedFileName, 'tsconfig.json')
      : resolvedFileName;

    return isFile(absolutePath) ? absolutePath : undefined;
  }

  if (statSync(cwd).isFile()) {
    return resolve(cwd);
  }

  const configAbsolutePath = walkForTsConfig(cwd);
  return configAbsolutePath ? resolve(configAbsolutePath) : undefined;
};

/**
 * Loads the `jsonString` and returns it as a TsConfigJson object.
 */
const parseTsConfigJson = (jsonString: string): TsConfigJson | undefined => {
  try {
    const json = JSON5.parse(jsonString);
    return json && typeof json === 'object' ? json : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Loads a tsconfig file while also resolving the extends path.
 */
const loadTsConfig = (configFilePath: string): TsConfigJson | undefined => {
  if (!existsSync(configFilePath)) return undefined;

  const configString = readFileSync(configFilePath, 'utf8');
  const jsonString = StripBom(configString);
  const config = parseTsConfigJson(jsonString);
  let extendedConfig = config?.extends;

  if (!config || !extendedConfig) return config;

  let base: TsConfigJson;

  if (parseFilePath(extendedConfig).isPackage) {
    const newConfigPath = require.resolve(extendedConfig);

    if (isDirectory(newConfigPath)) {
      extendedConfig = join(newConfigPath, 'tsconfig.json');
    } else if (isFile(newConfigPath)) {
      extendedConfig = newConfigPath;
    } else if (isFile(`${newConfigPath}.json`)) {
      extendedConfig = `${newConfigPath}.json`;
    }

    base = loadTsConfig(extendedConfig) ?? {};
  } else {
    if (!extendedConfig.endsWith('.json')) {
      extendedConfig += '.json';
    }

    const currentDir = dirname(configFilePath);
    base = loadTsConfig(join(currentDir, extendedConfig)) ?? {};
  }

  // baseUrl should be interpreted as relative to the base tsconfig, but we need
  // to update it so it is relative to the original tsconfig being loaded
  if (base?.compilerOptions?.baseUrl) {
    const extendsDir = dirname(extendedConfig);
    base.compilerOptions.baseUrl = join(
      extendsDir,
      base.compilerOptions.baseUrl,
    );
  }

  return {
    ...base,
    ...config,
    compilerOptions: {
      ...base.compilerOptions,
      ...config.compilerOptions,
    },
  };
};

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

export const CacheStrategy = {
  /**
   * Caching never happens and the returned value is always recalculated.
   */
  Never: 'never',

  /**
   * The first time the `tsconfigResolver` method is run it will save a cached
   * value (by `fileName`) which will be returned every time after that. This
   * value will always be the same.
   */
  Always: 'always',

  /**
   * The cache will be used when the same directory (and fileName) is being
   * searched.
   */
  Directory: 'directory',
} as const;

/**
 * The available cache strategies as a union of strings.
 */
export type CacheStrategyType = typeof CacheStrategy[keyof typeof CacheStrategy];

const cacheObject = {
  [CacheStrategy.Always]: new Map<string, TsConfigResult>(),
  [CacheStrategy.Directory]: new Map<string, TsConfigResult>(),
};

/**
 * Based on the options passed in, retrieve the value from the cache or return
 * undefined if the value still needs to be calculated.
 */
const getCache = ({
  cacheStrategy,
  cwd,
  fileName,
}: Required<TsConfigResolverOptions>): TsConfigResult | undefined => {
  if (cacheStrategy === CacheStrategy.Always) {
    return cacheObject[CacheStrategy.Always].get(fileName);
  }

  if (cacheStrategy === CacheStrategy.Directory) {
    return cacheObject[CacheStrategy.Always].get(join(cwd, fileName));
  }

  return undefined;
};

/**
 * Updates the cache with the provided result.
 */
const updateCache = (
  { cacheStrategy, cwd, fileName }: Required<TsConfigResolverOptions>,
  result: TsConfigResult,
): void => {
  if (cacheStrategy === CacheStrategy.Always) {
    cacheObject[CacheStrategy.Always].set(fileName, result);
  } else if (cacheStrategy === CacheStrategy.Directory) {
    cacheObject[CacheStrategy.Always].set(join(cwd, fileName), result);
  }
};

/**
 * Get the nearest tsconfig by walking up the directory.
 */
const getTsConfigResult = ({
  cwd,
  fileName,
}: Required<
  Except<TsConfigResolverOptions, 'cacheStrategy'>
>): TsConfigResult => {
  const configPath = resolveConfigPath(cwd, fileName);

  if (!configPath) {
    return {
      exists: false,
      reason: TsConfigErrorReason.NotFound,
    };
  }

  const config = loadTsConfig(configPath);

  if (!config) {
    return {
      exists: false,
      reason: TsConfigErrorReason.InvalidConfig,
      path: configPath,
    };
  }

  return {
    exists: true,
    path: configPath,
    config,
  };
};

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
export function tsconfigResolver({
  cwd = process.cwd(),
  cacheStrategy = CacheStrategy.Never,
  fileName = DEFAULT_FILENAME,
}: TsConfigResolverOptions = {}): TsConfigResult {
  const cache = getCache({ cwd, cacheStrategy, fileName });

  if (cache) {
    return cache;
  }

  const result = getTsConfigResult({ cwd, fileName });
  updateCache({ cwd, cacheStrategy, fileName }, result);

  return result;
}

/**
 * Clears the cache.
 */
export const clearCache = () => {
  for (const map of Object.values(cacheObject)) {
    map.clear();
  }
};
