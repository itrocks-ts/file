import { inherits }       from '@itrocks/class-type'
import { isAnyType }      from '@itrocks/class-type'
import { Representative } from '@itrocks/class-view'
import { ReflectClass }   from '@itrocks/reflect'
import { Required }       from '@itrocks/required'
import { Store }          from '@itrocks/store'

export * from './transformers'

@Representative('name') @Store()
export class File
{

	content?: Buffer

	@Required()
	name = ''

}

class ReflectClassHasFileProperty<T extends object> extends ReflectClass<T>
{

	hasFileProperty()
	{
		for (const property of this.properties) {
			const type = property.type.lead
			if (isAnyType(type) && inherits(type, File)) {
				return true
			}
		}
		return false
	}

}
// @ts-ignore hasFileProperty used in templates
ReflectClass.prototype.hasFileProperty = ReflectClassHasFileProperty.prototype.hasFileProperty
