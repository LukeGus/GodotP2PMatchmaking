import { describe, it } from 'node:test'
import assert from 'node:assert'
import { requireEnum, requireParam } from '../../src/assertions.mjs'

describe('assertions', () => {
  describe('requireParam', () => {
    it('should return param', () => {
      // Given
      const expected = 42

      // When
      const actual = requireParam(expected)

      // Then
      assert.equal(actual, expected)
    })

    it('should throw on missing', () => {
      // Given
      const param = undefined

      // When + Then
      assert.throws(
        () => requireParam(param)
      )
    })

    it('should not throw on falsy', () => {
      // Given
      const expected = false

      // When
      const actual = requireParam(expected)

      // Then
      assert.equal(actual, expected)
    })
  })

  describe('requireEnum', () => {
    const TestEnum = Object.freeze({
      Foo: 'foo',
      Bar: 'bar'
    })

    it('should return param', () => {
      // Given
      const expected = TestEnum.Bar

      // When
      const actual = requireEnum(expected, TestEnum)

      // Then
      assert.equal(actual, expected)
    })

    it('should throw on invalid', () => {
      // Given
      const invalid = '@@$invalid$@@'

      // When + Then
      assert.throws(
        () => requireEnum(invalid, TestEnum),
        err => assert.equal(err.message, 'Invalid enum value: ' + invalid) ?? true
      )
    })
  })
})
