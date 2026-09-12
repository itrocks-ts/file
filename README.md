[![npm version](https://img.shields.io/npm/v/@itrocks/file?logo=npm)](https://www.npmjs.org/package/@itrocks/file)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/file)](https://www.npmjs.org/package/@itrocks/file)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/file?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/file)
[![issues](https://img.shields.io/github/issues/itrocks-ts/file)](https://github.com/itrocks-ts/file/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# file

File object with it.rocks transformers for form and data handling.

*This documentation was written by an artificial intelligence and may contain errors or approximations.
It has not yet been fully reviewed by a human. If anything seems unclear or incomplete,
please feel free to contact the author of this package.*

## Installation

```bash
npm i @itrocks/file
```

## Usage

`@itrocks/file` provides a `File` class that represents an uploaded file,
a storage port with a local-filesystem implementation, plus transformers that
integrate file properties into the `@itrocks/*` form and view system.

In practice you:

- declare properties of type `File` in your domain models,
- initialize the file transformers once at application startup,
- let the framework render `<input type="file">` fields for those
  properties,
- and receive `File` instances populated from the incoming HTTP request.

### Minimal example

```ts
import { File, initFileTransformers } from '@itrocks/file'

// Run once when your application boots
initFileTransformers()

class Document
{
	file?: File
}

// After a form submission handled by the it.rocks stack,
// the `file` property will contain the uploaded file.
```

### Complete example: HTML form handling

The following example shows the full round‑trip:

1. you define a model with a `File` property,
2. the view system generates the HTML form field,
3. after submission the request is transformed back into a `File`
   instance.

```ts
import type { ObjectOrType } from '@itrocks/class-type'
import { displayOf }          from '@itrocks/property-view'
import { toCssId, toField }   from '@itrocks/rename'
import { EDIT, HTML }         from '@itrocks/transformer'
import {
	File,
	initFileTransformers,
} from '@itrocks/file'

class UserDocument
{
	// The file to upload
	file?: File
}

// 1. Initialise once at startup so the framework knows how to
//    render and read `File` properties in HTML
initFileTransformers()

// 2. Somewhere in your rendering code, the generic view layer asks
//    the transformer system for the HTML representation of `file`.
//    You normally don't call this directly; it is shown here to
//    illustrate what happens under the hood.
function renderFileField<T extends object>(
	target: ObjectOrType<T>,
	property: keyof T,
): string
{
	// The framework will end up using the same logic as provided by
	// this package's HTML transformers: a label plus
	// `<input type="file">` tied to the property.
	const fieldId   = toCssId(property)
	const fieldName = toField(property)
	const label     = `<label for="${fieldId}">${displayOf(target, property)}</label>`
	const input     = `<input id="${fieldId}" name="${fieldName}" type="file">`
	return label + input
}

// 3. When handling a POST request, the framework converts the
//    incoming multipart/form-data into a `File` instance, using the
//    transformers registered by `initFileTransformers()`.
//    You simply work with `UserDocument` and its `file` property.
```

## API

### File storage

`FileStorage` is the storage port for opaque binary objects. Its contract exposes
`cleanup`, `write`, `read`, `delete`, `has` and `references`; callers never receive a filesystem
path. `read(reference, start?, end?)` optionally reads an inclusive byte range without loading the
whole object. Bind an implementation once during application startup:

```ts
import { LocalFileStorage } from '@itrocks/file'
import { setFileStorage }   from '@itrocks/file'

setFileStorage(new LocalFileStorage('/srv/application/media'))
```

`LocalFileStorage` creates private files atomically without overwriting with random 192-bit
base64url references. It rejects every caller-supplied reference that does not match the
opaque reference format, so filenames and path traversal input never become storage paths.
Call `cleanup()` during startup to remove temporary files left by an interrupted write.

Use `fileStorage()` from domain or application code after startup binding. Another
implementation can extend `FileStorage` without changing callers.

### `class File`

Represents a file uploaded by a user or otherwise attached to a
domain object.

The `File` class is decorated for use with the it.rocks ecosystem:

- `@Representative('name')` from `@itrocks/class-view` means that,
  when a `File` instance is displayed as text, the `name` property is
  used as its label.
- `@Store()` from `@itrocks/store` integrates file instances with the
  storage mechanism used by your application.

#### Properties

- `name: string`

	Name of the file, typically the original filename provided by the
	client. This property is required.

- `content?: Buffer`

	Binary content of the file. It may be `undefined`, for example when
	working with metadata only or when the content is loaded lazily.

#### Typical usage

You usually do not instantiate `File` manually. Instances are created
by the transformers of this package from incoming HTTP requests, then
attached to your models.

However, you can also create a `File` yourself when needed:

```ts
import { File } from '@itrocks/file'

const file = new File()
file.name    = 'example.txt'
file.content = Buffer.from('Hello world', 'utf8')
```

---

### `function initFileHtmlTransformers(): void`

Registers HTML transformers for properties of type `File`.

After calling this function:

- in *edit* mode, `File` properties are rendered as a label plus an
  `<input type="file">` field,
- in *input* mode, incoming `RequestFile` objects are converted into
  `File` instances,
- in *output* mode, a `File` can be converted to a string
  representation (for example when generating an HTML view).

You normally call `initFileTransformers()` instead, which includes
HTML transformers, but `initFileHtmlTransformers()` is available if
you only need HTML support.

#### Example

```ts
import { initFileHtmlTransformers } from '@itrocks/file'

initFileHtmlTransformers()
```

---

### `function initFileTransformers(): void`

Initialises all transformers related to the `File` type.

At the moment this is equivalent to calling `initFileHtmlTransformers()`,
but you should prefer `initFileTransformers()` in your code so that
future non‑HTML transformers (for example JSON or other formats) are
also registered automatically.

This function is idempotent: calling it multiple times is safe, though
it is usually done once during application startup.

#### Example

```ts
import { initFileTransformers } from '@itrocks/file'

initFileTransformers()
```

## Typical use cases

- Add file upload capabilities to your domain models by declaring
  properties of type `File` (for example `avatar?: File` or
  `contract?: File`).
- Let the it.rocks form system automatically generate `<input type="file">`
  fields for `File` properties, without writing custom HTML.
- Handle multipart form submissions and receive populated `File`
  instances in your request handlers, instead of manually parsing
  uploaded files.
- Display links or labels for uploaded files in your HTML views using
  the same view/transformer infrastructure as for other types.
- Prepare your models for future non‑HTML file transformers (such as
  JSON or API‑level representations) by relying on `initFileTransformers()`.
