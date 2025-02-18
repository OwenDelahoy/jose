# Interface: JWTVerifyGetKey

[jwt/verify](../modules/jwt_verify.md).JWTVerifyGetKey

## Hierarchy

- [`GetKeyFunction`](types.GetKeyFunction.md)<[`JWSHeaderParameters`](types.JWSHeaderParameters.md), [`FlattenedJWSInput`](types.FlattenedJWSInput.md)\>

  ↳ **`JWTVerifyGetKey`**

## Callable

### JWTVerifyGetKey

▸ **JWTVerifyGetKey**(`protectedHeader`, `token`): `Promise`<[`KeyLike`](../types/types.KeyLike.md)\>

Interface for JWT Verification dynamic key resolution.
No token components have been verified at the time of this function call.

See [createRemoteJWKSet](../functions/jwks_remote.createRemoteJWKSet.md#function-createremotejwkset)
to verify using a remote JSON Web Key Set.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protectedHeader` | [`JWSHeaderParameters`](types.JWSHeaderParameters.md) |
| `token` | [`FlattenedJWSInput`](types.FlattenedJWSInput.md) |

#### Returns

`Promise`<[`KeyLike`](../types/types.KeyLike.md)\>

#### Defined in

[types.d.ts:152](https://github.com/panva/jose/blob/v3.15.4/src/types.d.ts#L152)
