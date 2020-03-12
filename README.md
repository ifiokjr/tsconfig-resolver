# tsconfig-resolver

[![GitHub Actions Build Status](https://github.com/ifiokjr/tsconfig-resolver/workflows/Node%20CI/badge.svg)](https://github.com/ifiokjr/tsconfig-resolver/actions?query=workflow%3A%22Node+CI%22)
[![npm](https://img.shields.io/npm/dm/tsconfig-resolver.svg?&logo=npm)](https://www.npmjs.com/package/tsconfig-resolver)
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors)
[![Typed Codebase][typescript]](./src/index.ts)
![MIT License][license]
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

> A tool for loading the nearest tsconfig file in the same way the TypeScript compiler does. It walks up the directory tree until it finds the first matching `tsconfig.json` file.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->

- [tsconfig-resolver](#tsconfig-resolver)
  - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
    - [Setup](#setup)
    - [Code Example](#code-example)
  - [API](#api)
    - [`tsconfigResolver`](#tsconfigresolver)
      - [Options](#options)
    - [`CacheStrategy`](#cachestrategy)
    - [`clearCache`](#clearcache)
    - [Versioning](#versioning)
    - [License](#license)
    - [Contributors](#contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usage

`tsconfig-resolver` is designed to be used inside your node project.

### Setup

First, install the plugin and it's peer dependencies:

```bash
npm install --save tsconfig-resolver
```

or

```bash
yarn add tsconfig-resolver
```

### Code Example

The following will load the first `tsconfig.json` file working upwards from the `process.cwd()` of the running node process.

```ts
import { tsconfigResolver } from 'tsconfig-resolver';

const result = tsconfigResolver();

// without type narrowing
console.log(result?.config);

// with type narrowing
if (result.exists) {
  console.log(result.config);
}
```

Configuration options can also be passed into the export function.

```ts
import { tsconfigResolver, CacheStrategy } from 'tsconfig-resolver';
import { join } from 'path';

const result = tsconfig({
  cwd: join(__dirname, 'src'),
  fileName: 'tsconfig.prod.json',
  cacheStrategy: CacheStrategy.Directory,
});
```

## API

### `tsconfigResolver`

```ts
import { tsconfigResolver } from 'tsconfig-resolver';
```

#### Options

| Property        | Type   | Default               | Description                                                                                         |
| --------------- | ------ | --------------------- | --------------------------------------------------------------------------------------------------- |
| `cwd`           | string | `process.cwd()`       | The directory to start searching from                                                               |
| `fileName`      | string | `'tsconfig.json'`     | Set the file name of the config file to search for.                                                 |
| `cacheStrategy` | string | `CacheStrategy.Never` | Set the caching strategy that will be used when searching for a file that's already been found. See |

### `CacheStrategy`

```ts
import { CacheStrategy } from 'tsconfig-resolver';
```

Provides the available caching strategies that can be used.

Sometimes you'll want to run this module several times during runtime but it can be slow and expensive walk up the file tree for the tsconfig value every time.

To help prevent unnecessary lookups there are custom caching strategies available.

- `CacheStrategy.Never` - Caching never happens and the returned value is always recalculated
- `CacheStrategy.Always` - The first time the `tsconfigResolver` method is run it will save a cached value (by `fileName`) which will be returned every time after that. This value will always be the same.
- `CacheStrategy.Directory` - The cache will be used when the same directory (and `fileName`) is being searched.

### `clearCache`

Clears the cache.

```ts
import { tsconfigResolver, clearCache } from 'tsconfig-resolver';

const result = tsconfigResolver();

// Now clear the cache.
clearCache();
```

<br />

### Contributing

Please read [contributing.md](docs/contributing.md) for details on our code of conduct, and the process for
submitting pull requests.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/remirror/remirror)

<br />

### Versioning

This project uses [SemVer](http://semver.org/) for versioning. For the versions available, see the
[tags on this repository](https://github.com/ifiokjr/tsconfig-resolver/tags).

<br />

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

### Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
