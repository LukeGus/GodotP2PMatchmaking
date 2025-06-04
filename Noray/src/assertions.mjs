import { fail } from 'node:assert'

/**
* Ensure param is present.
* @param {T} value Param value
* @returns {T} Param value
* @throws on missing param
* @template T
*/
export function requireParam (value) {
  return value ?? fail('Mising parameter!')
}

/**
* Ensure param is a valid enum value.
* @param {T} value Param value
* @param {object} enumDef Enum
* @returns {T} Param value
* @throws on invalid param
* @template T
*/
export function requireEnum (value, enumDef) {
  return Object.values(enumDef).includes(value)
    ? value
    : fail('Invalid enum value: ' + value)
}
