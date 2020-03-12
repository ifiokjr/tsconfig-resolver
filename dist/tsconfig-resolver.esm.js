import { statSync, existsSync, readFileSync, lstatSync } from 'fs';
import JSON5 from 'json5';
import path, { join, resolve, dirname } from 'path';
import StripBom from 'strip-bom';

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

var _cacheObject;
var DEFAULT_FILENAME = 'tsconfig.json';
/**
 * Extends the default node file parser and determines whether the path provided
 * should be resolved from the node modules or directly from the provided path.
 */

var parseFilePath = function parseFilePath(file, _temp) {
  var _ref = _temp === void 0 ? {} : _temp,
      windows = _ref.windows;

  var isWindows = windows !== null && windows !== void 0 ? windows : process.platform === 'win32';
  var parser = isWindows ? path.win32.parse : path.parse;
  var parsedPath = parser(file);
  return _extends({}, parsedPath, {
    isAbsolute: Boolean(parsedPath.root),
    isPackage: !file.startsWith('.') && !parsedPath.root
  });
};
/**
 * The reason that the tsconfig exist flag is false.
 */


var TsConfigErrorReason = {
  /**
   * The `tsconfig` file could not be found.
   */
  NotFound: 'not-found',

  /**
   * The file was found but the configuration was invalid.
   */
  InvalidConfig: 'invalid-config'
};

var walkForTsConfig = function walkForTsConfig(directory) {
  var configPath = join(directory, './tsconfig.json');

  if (existsSync(configPath)) {
    return configPath;
  }

  var parentDirectory = join(directory, '../'); // If we reached the top

  if (directory === parentDirectory) {
    return undefined;
  }

  return walkForTsConfig(parentDirectory);
};
/**
 * Check that the passed string is a directory.
 */


var isDirectory = function isDirectory(directory) {
  try {
    return lstatSync(directory).isDirectory();
  } catch (_unused) {
    return false;
  }
};
/**
 * Check that the passed filePath is a valid file.
 */


var isFile = function isFile(filePath) {
  try {
    return lstatSync(filePath).isFile();
  } catch (_unused2) {
    return false;
  }
};

var resolveConfigPath = function resolveConfigPath(cwd, fileName) {
  if (fileName === void 0) {
    fileName = DEFAULT_FILENAME;
  }

  if (fileName !== DEFAULT_FILENAME) {
    var resolvedFileName = resolve(cwd, fileName);
    var absolutePath = isDirectory(resolvedFileName) ? resolve(resolvedFileName, 'tsconfig.json') : resolvedFileName;
    return isFile(absolutePath) ? absolutePath : undefined;
  }

  if (statSync(cwd).isFile()) {
    return resolve(cwd);
  }

  var configAbsolutePath = walkForTsConfig(cwd);
  return configAbsolutePath ? resolve(configAbsolutePath) : undefined;
};
/**
 * Loads the `jsonString` and returns it as a TsConfigJson object.
 */


var parseTsConfigJson = function parseTsConfigJson(jsonString) {
  try {
    var json = JSON5.parse(jsonString);
    return json && typeof json === 'object' ? json : undefined;
  } catch (_unused3) {
    return undefined;
  }
};
/**
 * Loads a tsconfig file while also resolving the extends path.
 */


var loadTsConfig = function loadTsConfig(configFilePath) {
  var _base, _base$compilerOptions;

  if (!existsSync(configFilePath)) return undefined;
  var configString = readFileSync(configFilePath, 'utf8');
  var jsonString = StripBom(configString);
  var config = parseTsConfigJson(jsonString);
  var extendedConfig = config === null || config === void 0 ? void 0 : config["extends"];
  if (!config || !extendedConfig) return config;
  var base;

  if (parseFilePath(extendedConfig).isPackage) {
    var _loadTsConfig;

    var newConfigPath = require.resolve(extendedConfig);

    if (isDirectory(newConfigPath)) {
      extendedConfig = join(newConfigPath, 'tsconfig.json');
    } else if (isFile(newConfigPath)) {
      extendedConfig = newConfigPath;
    } else if (isFile(newConfigPath + ".json")) {
      extendedConfig = newConfigPath + ".json";
    }

    base = (_loadTsConfig = loadTsConfig(extendedConfig)) !== null && _loadTsConfig !== void 0 ? _loadTsConfig : {};
  } else {
    var _loadTsConfig2;

    if (!extendedConfig.endsWith('.json')) {
      extendedConfig += '.json';
    }

    var currentDir = dirname(configFilePath);
    base = (_loadTsConfig2 = loadTsConfig(join(currentDir, extendedConfig))) !== null && _loadTsConfig2 !== void 0 ? _loadTsConfig2 : {};
  } // baseUrl should be interpreted as relative to the base tsconfig, but we need
  // to update it so it is relative to the original tsconfig being loaded


  if ((_base = base) === null || _base === void 0 ? void 0 : (_base$compilerOptions = _base.compilerOptions) === null || _base$compilerOptions === void 0 ? void 0 : _base$compilerOptions.baseUrl) {
    var extendsDir = dirname(extendedConfig);
    base.compilerOptions.baseUrl = join(extendsDir, base.compilerOptions.baseUrl);
  }

  return _extends({}, base, {}, config, {
    compilerOptions: _extends({}, base.compilerOptions, {}, config.compilerOptions)
  });
};

var CacheStrategy = {
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
  Directory: 'directory'
};
var cacheObject = (_cacheObject = {}, _cacheObject[CacheStrategy.Always] = /*#__PURE__*/new Map(), _cacheObject[CacheStrategy.Directory] = /*#__PURE__*/new Map(), _cacheObject);
/**
 * Based on the options passed in, retrieve the value from the cache or return
 * undefined if the value still needs to be calculated.
 */

var getCache = function getCache(_ref2) {
  var cacheStrategy = _ref2.cacheStrategy,
      cwd = _ref2.cwd,
      fileName = _ref2.fileName;

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


var updateCache = function updateCache(_ref3, result) {
  var cacheStrategy = _ref3.cacheStrategy,
      cwd = _ref3.cwd,
      fileName = _ref3.fileName;

  if (cacheStrategy === CacheStrategy.Always) {
    cacheObject[CacheStrategy.Always].set(fileName, result);
  } else if (cacheStrategy === CacheStrategy.Directory) {
    cacheObject[CacheStrategy.Always].set(join(cwd, fileName), result);
  }
};
/**
 * Get the nearest tsconfig by walking up the directory.
 */


var getTsConfigResult = function getTsConfigResult(_ref4) {
  var cwd = _ref4.cwd,
      fileName = _ref4.fileName;
  var configPath = resolveConfigPath(cwd, fileName);

  if (!configPath) {
    return {
      exists: false,
      reason: TsConfigErrorReason.NotFound
    };
  }

  var config = loadTsConfig(configPath);

  if (!config) {
    return {
      exists: false,
      reason: TsConfigErrorReason.InvalidConfig,
      path: configPath
    };
  }

  return {
    exists: true,
    path: configPath,
    config: config
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


function tsconfigResolver(_temp2) {
  var _ref5 = _temp2 === void 0 ? {} : _temp2,
      _ref5$cwd = _ref5.cwd,
      cwd = _ref5$cwd === void 0 ? process.cwd() : _ref5$cwd,
      _ref5$cacheStrategy = _ref5.cacheStrategy,
      cacheStrategy = _ref5$cacheStrategy === void 0 ? CacheStrategy.Never : _ref5$cacheStrategy,
      _ref5$fileName = _ref5.fileName,
      fileName = _ref5$fileName === void 0 ? DEFAULT_FILENAME : _ref5$fileName;

  var cache = getCache({
    cwd: cwd,
    cacheStrategy: cacheStrategy,
    fileName: fileName
  });

  if (cache) {
    return cache;
  }

  var result = getTsConfigResult({
    cwd: cwd,
    fileName: fileName
  });
  updateCache({
    cwd: cwd,
    cacheStrategy: cacheStrategy,
    fileName: fileName
  }, result);
  return result;
}
/**
 * Clears the cache.
 */

var clearCache = function clearCache() {
  for (var _i = 0, _Object$values = Object.values(cacheObject); _i < _Object$values.length; _i++) {
    var map = _Object$values[_i];
    map.clear();
  }
};

export { CacheStrategy, TsConfigErrorReason, clearCache, tsconfigResolver };
//# sourceMappingURL=tsconfig-resolver.esm.js.map
