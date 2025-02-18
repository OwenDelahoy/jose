# Interface: EncryptOptions

[types](../modules/types.md).EncryptOptions

JWE Encryption options.

## Hierarchy

- [`CritOption`](types.CritOption.md)

  ↳ **`EncryptOptions`**

## Table of contents

### Properties

- [crit](types.EncryptOptions.md#crit)
- [deflateRaw](types.EncryptOptions.md#deflateraw)

## Properties

### crit

• `Optional` **crit**: `Object`

An object with keys representing recognized "crit" (Critical) Header Parameter
names. The value for those is either `true` or `false`. `true` when the
Header Parameter MUST be integrity protected, `false` when it's irrelevant.

This makes the "Extension Header Parameter "${parameter}" is not recognized"
error go away.

Use this when a given JWS/JWT/JWE profile requires the use of proprietary
non-registered "crit" (Critical) Header Parameters. This will only make sure
the Header Parameter is syntactically correct when provided and that it is
optionally integrity protected. It will not process the Header Parameter in
any way or reject if the operation if it is missing. You MUST still
verify the Header Parameter was present and process it according to the
profile's validation steps after the operation succeeds.

The JWS extension Header Parameter `b64` is always recognized and processed
properly. No other registered Header Parameters that need this kind of
default built-in treatment are currently available.

#### Index signature

▪ [propName: `string`]: `boolean`

#### Inherited from

[CritOption](types.CritOption.md).[crit](types.CritOption.md#crit)

#### Defined in

[types.d.ts:440](https://github.com/panva/jose/blob/v3.15.4/src/types.d.ts#L440)

___

### deflateRaw

• `Optional` **deflateRaw**: [`DeflateFunction`](types.DeflateFunction.md)

In a browser runtime you have to provide an implementation for Deflate Raw
when you will be producing JWEs with compressed plaintext.

#### Defined in

[types.d.ts:476](https://github.com/panva/jose/blob/v3.15.4/src/types.d.ts#L476)
