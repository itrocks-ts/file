import { ObjectOrType }                from '@itrocks/class-type'
import { controlField }                from '@itrocks/form-controls'
import { ControlScope }                from '@itrocks/form-controls'
import { fileControl }                 from '@itrocks/form-controls'
import { RequestFile }                 from '@itrocks/request-response'
import { EDIT, HTML, INPUT, OUTPUT }   from '@itrocks/transformer'
import { setPropertyTypeTransformers } from '@itrocks/transformer'
import { File }                        from './file'

function fileEdit<T extends object>(
	_value: File | undefined, target: ObjectOrType<T>, property: keyof T, scope?: ControlScope
) {
	return fileControl(controlField(target, property, scope))
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
