# Interface: CritOption

[types](../modules/types.md).CritOption

Shared Interface with a "crit" property for all sign and verify operations.

## Hierarchy

- **`CritOption`**

  ↳ [`DecryptOptions`](types.DecryptOptions.md)

  ↳ [`EncryptOptions`](types.EncryptOptions.md)

  ↳ [`VerifyOptions`](types.VerifyOptions.md)

  ↳ [`SignOptions`](types.SignOptions.md)

## Table of contents

### Properties

- [crit](types.CritOption.md#crit)

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

#### Defined in

[types.d.ts:440](https://github.com/panva/jose/blob/v3.15.4/src/types.d.ts#L440)
