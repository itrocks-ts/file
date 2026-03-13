import { ObjectOrType }                from '@itrocks/class-type'
import { displayOf }                   from '@itrocks/property-view'
import { toCssId, toField }            from '@itrocks/rename'
import { RequestFile }                 from '@itrocks/request-response'
import { EDIT, HTML, INPUT, OUTPUT }   from '@itrocks/transformer'
import { setPropertyTypeTransformers } from '@itrocks/transformer'
import { tr }                          from '@itrocks/translate'
import { File }                        from './file'

function fileEdit<T extends object>(value: File | undefined, target: ObjectOrType<T>, property: keyof T)
{
	const fieldId   = toCssId(property)
	const fieldName = toField(property)
	const label     = `<label for="${fieldId}">${tr(displayOf(target, property))}</label>`
	const input     = `<input id="${fieldId}" name="${fieldName}" type="file">`
	return label + input
}

function fileInput(requestFile: RequestFile): File
{
	const file   = new File()
	file.name    = requestFile.filename
	file.content = requestFile.buffer
	return file
}

function fileOutput<T extends object>(value: File | undefined, target: ObjectOrType<T>, property: keyof T)
{
	return value ? value.toString() : ''
}

export function initFileHtmlTransformers()
{
	setPropertyTypeTransformers(File, [
		{ format: HTML, direction: EDIT,   transformer: fileEdit },
		{ format: HTML, direction: INPUT,  transformer: fileInput },
		{ format: HTML, direction: OUTPUT, transformer: fileOutput }
	])
}

export function initFileTransformers()
{
	initFileHtmlTransformers()
}
