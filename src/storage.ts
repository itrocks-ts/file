import { randomBytes } from 'node:crypto'
import { constants }   from 'node:fs'
import { access }      from 'node:fs/promises'
import { chmod }       from 'node:fs/promises'
import { link }        from 'node:fs/promises'
import { mkdir }       from 'node:fs/promises'
import { open }        from 'node:fs/promises'
import { readdir }     from 'node:fs/promises'
import { readFile }    from 'node:fs/promises'
import { rm }          from 'node:fs/promises'
import { join }        from 'node:path'
import { resolve }     from 'node:path'

const referencePattern = /^[A-Za-z0-9_-]{32}$/

export abstract class FileStorage
{

	abstract cleanup(): Promise<void>

	abstract delete(reference: string): Promise<void>

	abstract has(reference: string): Promise<boolean>

	abstract read(reference: string, start?: number, end?: number): Promise<Buffer>

	abstract references(): Promise<string[]>

	abstract write(content: Buffer): Promise<string>

}

export class LocalFileStorage extends FileStorage
{

	readonly root: string

	constructor(root: string)
	{
		super()
		this.root = resolve(root)
	}

	async cleanup(): Promise<void>
	{
		try {
			for (const entry of await readdir(this.root, { withFileTypes: true })) {
				if (entry.isFile() && entry.name.startsWith('.') && referencePattern.test(entry.name.slice(1))) {
					await rm(join(this.root, entry.name), { force: true })
				}
			}
		}
		catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
		}
	}

	async delete(reference: string): Promise<void>
	{
		await rm(this.path(reference), { force: true })
	}

	async has(reference: string): Promise<boolean>
	{
		try {
			await access(this.path(reference), constants.R_OK)
			return true
		}
		catch {
			return false
		}
	}

	async read(reference: string, start?: number, end?: number): Promise<Buffer>
	{
		const path = this.path(reference)
		if ((start === undefined) && (end === undefined)) return readFile(path)
		if (
			(start === undefined)
			|| (end === undefined)
			|| !Number.isSafeInteger(start)
			|| !Number.isSafeInteger(end)
			|| (start < 0)
			|| (start > end)
		) throw new Error('Invalid file byte range')
		const length = end - start + 1
		const buffer = Buffer.allocUnsafe(length)
		const file   = await open(path, 'r')
		try {
			const { bytesRead } = await file.read(buffer, 0, length, start)
			if (bytesRead !== length) throw new Error('File byte range exceeds content')
			return buffer
		}
		finally {
			await file.close()
		}
	}

	async references(): Promise<string[]>
	{
		try {
			return (await readdir(this.root, { withFileTypes: true }))
				.filter(entry => entry.isFile() && referencePattern.test(entry.name))
				.map(entry => entry.name)
				.sort()
		}
		catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
			throw error
		}
	}

	async write(content: Buffer): Promise<string>
	{
		await mkdir(this.root, { mode: 0o700, recursive: true })
		await chmod(this.root, 0o700)
		for (;;) {
			const reference = randomBytes(24).toString('base64url')
			const temporary = join(this.root, '.' + reference)
			let file
			try {
				file = await open(temporary, 'wx', 0o600)
				await file.writeFile(content)
				await file.sync()
				await file.close()
				file = undefined
				await link(temporary, this.path(reference))
				await rm(temporary)
				return reference
			}
			catch (error) {
				await file?.close().catch(() => undefined)
				await rm(temporary, { force: true }).catch(() => undefined)
				if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue
				throw error
			}
		}
	}

	private path(reference: string): string
	{
		if (!referencePattern.test(reference)) throw new Error('Invalid opaque file reference')
		return join(this.root, reference)
	}

}

let configuredStorage: FileStorage | undefined

export function fileStorage(): FileStorage
{
	if (!configuredStorage) throw new Error('File storage is not configured')
	return configuredStorage
}

export function setFileStorage(storage: FileStorage): void
{
	configuredStorage = storage
}
