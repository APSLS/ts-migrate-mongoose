import colors from 'colors'
import mongoose, { Connection } from 'mongoose'
import { getMigrator, Migrate } from '../src/commander'
import { clearDirectory } from '../utils/filesystem'

colors.enable()

const exec = (...args: string[]) => {
  const migrate = new Migrate()
  process.argv = ['node', 'migrate', ...args]
  return migrate.run(false)
}

describe('cli', () => {
  const uri = `${globalThis.__MONGO_URI__}${globalThis.__MONGO_DB_NAME__}`
  let connection: Connection

  beforeAll(async () => {
    clearDirectory('migrations')
    connection = await mongoose.createConnection(uri).asPromise()
  })

  afterAll(async () => {
    if (connection.readyState !== 0) {
      await connection.close()
    }
  })

  it('should get migrator instance', async () => {
    const migrator = await getMigrator({ uri })
    const connection = await migrator.connected()
    expect(migrator).toBeDefined()
    expect(connection).toBeDefined()
    expect(connection.readyState).toBe(1)
    await migrator.close()
    expect(connection.readyState).toBe(0)
  })

  it('should run list command', async () => {
    const consoleSpy = jest.spyOn(console, 'log')
    const opts = await exec('list', '-d', uri)
    expect(opts?.configPath).toBe('migrate')
    expect(opts?.uri).toBe(uri)
    expect(opts?.collection).toBe('migrations')
    expect(opts?.autosync).toBe(false)
    expect(opts?.migrationsPath).toBe('./migrations')
    expect(consoleSpy).toBeCalledWith('Listing migrations'.cyan)
    expect(consoleSpy).toBeCalledWith('There are no migrations to list'.yellow)
  })

  it('should run create command', async () => {
    const consoleSpy = jest.spyOn(console, 'log')
    const opts = await exec('create', 'migration-name-test', '-d', uri)
    expect(opts?.configPath).toBe('migrate')
    expect(opts?.uri).toBe(uri)
    expect(opts?.collection).toBe('migrations')
    expect(opts?.autosync).toBe(false)
    expect(opts?.migrationsPath).toBe('./migrations')
    expect(consoleSpy).toBeCalledWith(expect.stringMatching(/^Created migration migration-name-test in/))
    expect(consoleSpy).toBeCalledWith(expect.stringMatching(/^Migration created/))
  })

  it('should run up command', async () => {
    const consoleSpy = jest.spyOn(console, 'log')
    const opts = await exec('up', '-d', uri)
    expect(opts?.configPath).toBe('migrate')
    expect(opts?.uri).toBe(uri)
    expect(opts?.collection).toBe('migrations')
    expect(opts?.autosync).toBe(false)
    expect(opts?.migrationsPath).toBe('./migrations')
    expect(consoleSpy).toBeCalledWith(expect.stringMatching(/^up:/) && expect.stringMatching(/migration-name-test/))
    expect(consoleSpy).toBeCalledWith('All migrations finished successfully'.green)
  })

  it('should run down command', async () => {
    const consoleSpy = jest.spyOn(console, 'log')
    const opts = await exec('down', 'migration-name-test', '-d', uri)
    expect(opts?.configPath).toBe('migrate')
    expect(opts?.uri).toBe(uri)
    expect(opts?.collection).toBe('migrations')
    expect(opts?.autosync).toBe(false)
    expect(opts?.migrationsPath).toBe('./migrations')
    expect(consoleSpy).toBeCalledWith(expect.stringMatching(/^down:/) && expect.stringMatching(/migration-name-test/))
    expect(consoleSpy).toBeCalledWith('All migrations finished successfully'.green)
  })

  it('should throw "You need to provide the MongoDB Connection URI to persist migration status.\nUse option --uri / -d to provide the URI."', async () => {
    expect(exec('up', 'invalid-migration-name')).rejects.toThrowError('You need to provide the MongoDB Connection URI to persist migration status.\nUse option --uri / -d to provide the URI.')
  })

  it('should prune command', async () => {
    await exec('create', 'migration-name-prune', '-d', uri)
    await exec('up', 'migration-name-prune', '-d', uri, '-a', 'true')

    clearDirectory('migrations')

    const consoleSpy = jest.spyOn(console, 'log')
    const opts = await exec('prune', '-d', uri, '-a', 'true')
    expect(consoleSpy).toBeCalledWith(expect.stringMatching(/^Removing migration(s) from database/) && expect.stringMatching(/migration-name-test/))
    expect(opts?.configPath).toBe('migrate')
    expect(opts?.uri).toBe(uri)
    expect(opts?.collection).toBe('migrations')
    expect(opts?.autosync).toBe('true')
    expect(opts?.migrationsPath).toBe('./migrations')
  })
})
