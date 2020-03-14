import { join } from 'path';
import { tsconfigResolver, CacheStrategy, clearCache } from '..';

const processCwd = jest.spyOn(process, 'cwd');
const fixtures = (...paths: string[]) =>
  join(__dirname, '__fixtures__', ...paths);

describe('basic', () => {
  beforeEach(() => {
    processCwd.mockReturnValue(fixtures('basic'));
  });

  it('resolves the tsconfig by default', () => {
    const { exists, config, path } = tsconfigResolver();

    expect(path?.endsWith('__fixtures__/basic/tsconfig.json')).toBe(true);
    expect(exists).toBe(true);
    expect(config).toMatchInlineSnapshot(`
          Object {
            "compilerOptions": Object {
              "jsx": "preserve",
            },
          }
      `);
  });

  it('resolves from a sub directory', () => {
    processCwd.mockReturnValue(fixtures('basic', 'subdir'));

    const { exists, config, path } = tsconfigResolver();

    expect(path?.endsWith('__fixtures__/basic/tsconfig.json')).toBe(true);
    expect(exists).toBe(true);
    expect(config).toMatchInlineSnapshot(`
          Object {
            "compilerOptions": Object {
              "jsx": "preserve",
            },
          }
      `);
  });

  it('resolves with a custom fileName', () => {
    const { exists, config, path } = tsconfigResolver({
      fileName: 'tsconfig.alt.json',
    });

    expect(path?.endsWith('__fixtures__/basic/tsconfig.alt.json')).toBe(true);
    expect(exists).toBe(true);
    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "jsx": "react",
        },
      }
    `);
  });

  it('appends `tsconfig.json` when `fileName` is a directory', () => {
    const result = tsconfigResolver({ fileName: 'cachedir' });

    expect(
      result.path?.endsWith('__fixtures__/basic/cachedir/tsconfig.json'),
    ).toBe(true);
    expect(result.config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "alwaysStrict": true,
        },
      }
    `);
  });

  it('properly resolves invalid json', () => {
    const { exists, reason } = tsconfigResolver({
      fileName: 'tsconfig.invalid.json',
    });

    expect(exists).toBe(false);
    expect(reason).toBe('invalid-config');
  });

  it('properly resolves missing config', () => {
    const { exists, reason } = tsconfigResolver({
      fileName: 'tsconfig.missing.json',
    });

    expect(exists).toBe(false);
    expect(reason).toBe('not-found');
  });
});

describe('extends', () => {
  beforeEach(() => {
    processCwd.mockReturnValue(fixtures('extends'));
  });

  it('extends a base config', () => {
    const { config } = tsconfigResolver();

    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "allowJs": false,
          "baseUrl": "./",
          "paths": Object {
            "simple": Array [
              "./simple",
            ],
          },
        },
        "extends": "./base.tsconfig.json",
      }
    `);
  });

  it('extends and removes paths', () => {
    const { config } = tsconfigResolver({
      fileName: 'tsconfig.paths.json',
    });

    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "allowJs": false,
          "baseUrl": "./",
          "paths": Object {},
        },
        "extends": "./base.tsconfig.json",
      }
    `);
  });

  it('extends from npm', () => {
    const { config } = tsconfigResolver({
      fileName: 'tsconfig.npm.json',
    });

    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "declaration": true,
          "forceConsistentCasingInFileNames": true,
          "jsx": "react",
          "module": "commonjs",
          "moduleResolution": "node",
          "newLine": "lf",
          "noEmitOnError": true,
          "noFallthroughCasesInSwitch": true,
          "noImplicitReturns": true,
          "noUnusedLocals": true,
          "noUnusedParameters": true,
          "pretty": true,
          "resolveJsonModule": true,
          "skipLibCheck": true,
          "strict": true,
          "stripInternal": true,
          "target": "es2017",
        },
        "extends": "@sindresorhus/tsconfig",
      }
    `);
  });

  it('supports nested extends', () => {
    const { config } = tsconfigResolver({
      cwd: fixtures('extends', 'nested'),
    });

    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "allowJs": false,
          "baseUrl": "simple",
          "paths": Object {
            "b": Array [
              "./b",
            ],
            "g": Array [
              "./g",
            ],
          },
        },
        "extends": "../tsconfig.paths.json",
      }
    `);
  });
});

describe('caching', () => {
  beforeEach(() => {
    processCwd.mockReturnValue(fixtures('basic'));
  });

  it('supports fileName caching', () => {
    const result1 = tsconfigResolver({
      cacheStrategy: CacheStrategy.Always,
    });
    const result2 = tsconfigResolver({
      cwd: fixtures('basic', 'cachedir'),
      cacheStrategy: CacheStrategy.Always,
    });
    const result3 = tsconfigResolver({
      cacheStrategy: CacheStrategy.Always,
      fileName: 'fake',
    });
    expect(result1).toBe(result2);
    expect(result3).not.toBe(result2);
  });

  it('support directory caching', () => {
    const result1 = tsconfigResolver({
      cacheStrategy: CacheStrategy.Directory,
    });
    const result2 = tsconfigResolver({
      cwd: fixtures('basic', 'subdir'),
      cacheStrategy: CacheStrategy.Directory,
    });
    const result3 = tsconfigResolver({
      cacheStrategy: CacheStrategy.Directory,
    });
    const result4 = tsconfigResolver({
      cacheStrategy: CacheStrategy.Directory,
      fileName: 'fake',
    });

    expect(result1).not.toBe(result2);
    expect(result3).toBe(result1);
    expect(result4).not.toBe(result1);
  });

  it('supports clearing the cache', () => {
    const result1 = tsconfigResolver({
      cacheStrategy: CacheStrategy.Always,
    });
    clearCache();
    const result2 = tsconfigResolver({
      cacheStrategy: CacheStrategy.Always,
    });

    expect(result1).not.toBe(result2);
    expect(result1).toEqual(result2);
  });
});
