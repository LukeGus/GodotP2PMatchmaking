import { describe, it } from 'node:test'
import assert from 'node:assert'
import { assignMerger, idFieldMapper, IdInUseError, Repository, UnknownItemError } from '../../src/repository.mjs'

function TestItem (id, value) {
  return { id, value }
}

function makeRepository () {
  return new Repository({
    idMapper: idFieldMapper(),
    itemMerger: assignMerger()
  })
}

describe('Repository', () => {
  describe('add', () => {
    it('should add item', () => {
      // Given
      const repository = makeRepository()
      const expected = TestItem(0, 'foo')

      // When
      const actual = repository.add(expected)

      // Then
      assert.deepEqual(actual, expected)
      assert.equal([...repository.list()].length, 1)
    })

    it('should reject items with same id', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')
      const duplicate = TestItem(0, 'bar')

      repository.add(item)

      // When + then
      assert.throws(() => repository.add(duplicate), IdInUseError)
    })
  })

  describe('update', () => {
    it('should update item', () => {
      // Given
      const repository = makeRepository()
      const update = TestItem(0, 'bar')
      repository.add(TestItem(0, 'foo'))

      // When
      repository.update(update)

      // Then
      const actual = repository.find(update.id)
      assert.deepEqual(actual, update)
    })

    it('should reject unknown item', () => {
      // Given
      const repository = makeRepository()
      const update = TestItem(0, 'bar')

      // When + then
      assert.throws(() => repository.update(update), UnknownItemError)
    })
  })

  describe('find', () => {
    it('should return known item', () => {
      // Given
      const repository = makeRepository()
      const expected = TestItem(0, 'foo')
      repository.add(expected)

      // When
      const actual = repository.find(expected.id)

      // Then
      assert.deepEqual(actual, expected)
    })

    it('should return undefined on unknown', () => {
      // Given
      const repository = makeRepository()

      // When
      const actual = repository.find(0)

      // Then
      assert.equal(actual, undefined)
    })
  })

  describe('has', () => {
    it('should return true on known', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')
      repository.add(item)

      // When
      const result = repository.has(item.id)

      // Then
      assert(result)
    })

    it('should return false on unknown', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')

      // When
      const result = repository.has(item.id)

      // Then
      assert(!result)
    })
  })

  describe('list', () => {
    it('should return empty', () => {
      // Given
      const repository = makeRepository()
      const expected = []

      // When
      const actual = [...repository.list()]

      // Then
      assert.deepEqual(actual, expected)
    })

    it('should return items', () => {
      // Given
      const repository = makeRepository()
      const expected = [TestItem(0, 'foo'), TestItem(1, 'bar')]
      expected.forEach(item => repository.add(item))

      // When
      const actual = [...repository.list()]

      // Then
      assert.deepEqual(actual, expected)
    })
  })

  describe('remove', () => {
    it('should remove known', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')
      repository.add(item)

      // When
      const didRemove = repository.remove(item.id)

      // Then
      assert(didRemove)
      assert.equal([...repository.list()].length, 0)
    })

    it('should ignore unknown', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')

      // When
      const didRemove = repository.remove(item.id)

      // Then
      assert(!didRemove)
    })
  })

  describe('hasItem', () => {
    it('should return true on known', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')
      repository.add(item)

      // When
      const result = repository.hasItem(item)

      // Then
      assert(result)
    })

    it('should return false on unknown', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')

      // When
      const result = repository.hasItem(item)

      // Then
      assert(!result)
    })
  })

  describe('removeItem', () => {
    it('should remove known', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')
      repository.add(item)

      // When
      const didRemove = repository.removeItem(item)

      // Then
      assert(didRemove)
      assert.equal([...repository.list()].length, 0)
    })

    it('should ignore unknown', () => {
      // Given
      const repository = makeRepository()
      const item = TestItem(0, 'foo')

      // When
      const didRemove = repository.removeItem(item)

      // Then
      assert(!didRemove)
    })
  })
})
