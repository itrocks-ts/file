import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { LocalFileStorage } from '../cjs/file.js'

describe('local file storage', () => {
	it('writes, lists, reads and deletes an opaque private file', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'itrocks-file-'))
		try {
			const storage   = new LocalFileStorage(directory)
			const content   = Buffer.from('private media')
			const reference = await storage.write(content)

			assert.match(reference, /^[A-Za-z0-9_-]{32}$/)
			assert.deepEqual(await storage.references(), [reference])
			assert.deepEqual(await storage.read(reference), content)
			assert.equal(await storage.has(reference), true)
			assert.equal((await readdir(directory)).some(name => name.startsWith('.')), false)
			assert.equal((await stat(directory)).mode & 0o777, 0o700)
			assert.equal((await stat(join(directory, reference))).mode & 0o777, 0o600)

			await storage.delete(reference)
			assert.equal(await storage.has(reference), false)
			assert.deepEqual(await storage.references(), [])
		}
		finally {
			await rm(directory, { force: true, recursive: true })
		}
	})

	it('cleans an interrupted temporary write while listing references', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'itrocks-file-'))
		try {
			const storage   = new LocalFileStorage(directory)
			const temporary = join(directory, '.' + 'a'.repeat(32))
			await writeFile(temporary, 'partial')

			await storage.cleanup()
			assert.deepEqual(await storage.references(), [])
			await assert.rejects(stat(temporary), { code: 'ENOENT' })
		}
		finally {
			await rm(directory, { force: true, recursive: true })
		}
	})

	it('rejects path traversal references', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'itrocks-file-'))
		try {
			const storage = new LocalFileStorage(directory)
			await assert.rejects(storage.read('../outside'), /Invalid opaque file reference/)
			await assert.rejects(storage.delete('a'.repeat(31) + '/'), /Invalid opaque file reference/)
		}
		finally {
			await rm(directory, { force: true, recursive: true })
		}
	})
})
