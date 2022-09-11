import colors from 'colors'
import mongoose, { Connection, Types } from 'mongoose'

import Migrator from '../src/migrator'
import IMigratorOptions from '../src/interfaces/IMigratorOptions'

colors.enable()

describe('library', () => {
  const connectionString = `${globalThis.__MONGO_URI__}${globalThis.__MONGO_DB_NAME__}`
  let connection: Connection

  beforeAll(async () => {
    connection = await mongoose.createConnection(connectionString).asPromise()
  })

  afterAll(async () => {
    await connection.close()
  })

  it('should insert a doc into collection with migrator', async () => {
    const options: IMigratorOptions = {
      connectionString,
      // connection,
      autosync: true
    }
    const migrator = new Migrator(options)
    await migrator.prune()

    const migrationName = `test-migration-creation-${new Types.ObjectId().toHexString()}`
    const migration = await migrator.create(migrationName)

    expect(migration.filename).toContain(migrationName)
    expect(migration.name).toBe(migrationName)

    // Migrate Up
    await migrator.run('up', migrationName)

    const foundUp = await migrator.migrationModel.findById(migration._id)
    expect(foundUp?.state).toBe('up')
    expect(foundUp?.name).toBe(migrationName)

    // Migrate Down
    await migrator.run('down', migrationName)

    const foundDown = await migrator.migrationModel.findById(migration._id)
    expect(foundDown?.state).toBe('down')
    expect(foundDown?.name).toBe(migrationName)

    // List Migrations
    const migrationList = await migrator.list()
    expect(migrationList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: migrationName
        })
      ])
    )

    // Close the underlying connection to mongo
    await migrator.close()
  })
})