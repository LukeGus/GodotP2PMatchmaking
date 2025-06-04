/**
* Mapper function to retrieve ID from item
* @template T,K
* @typedef {function(T): K} RepositoryIdMapper
*/

/**
* Function to merge two objects for updating the repository.
* It takes the original and the updated, and returns the merged.
* @template T
* @typedef {function(T, T): T} RepositoryItemMerger
*/

export class IdInUseError extends Error { }
export class UnknownItemError extends Error { }

/**
* Base class for repositories.
* @template T,K
*/
export class Repository {
  /** @type {Map<K, T>} */
  #items = new Map()

  /** @type {function(T): K} */
  #idMapper

  /** @type {function(T, T): T} */
  #merger

  /**
  * Construct repository.
  * @param {object} [options] Options
  * @param {RepositoryIdMapper} [options.idMapper=idFieldMapper()] Id mapper
  * @param {RepositoryItemMerger} [options.itemMerger=assignMerger()] Item merger
  */
  constructor (options) {
    this.#idMapper = options?.idMapper ?? idFieldMapper()
    this.#merger = options?.itemMerger ?? assignMerger()
  }

  /**
  * Add item to repository.
  * @param {T} item Item
  * @returns {T} Stored item
  * @throws if item id is already in use
  */
  add (item) {
    const id = this.#idMapper(item)

    if (this.has(id)) {
      throw new IdInUseError(`Item already stored with id: ${id}`)
    }

    this.#items.set(id, item)

    return item
  }

  /**
  * Update an existing item.
  * @param {T} item Item
  * @throws if item id not known
  */
  update (item) {
    const id = this.#idMapper(item)

    if (!this.has(id)) {
      throw new UnknownItemError(`Trying to update unknown item with id: ${id}`)
    }

    this.#items.set(id, this.#merger(
      this.find(id),
      item
    ))
  }

  /**
  * Find item based on id.
  * @param {K} id Item id
  * @returns {T | undefined} Item or undefined
  */
  find (id) {
    return this.#items.get(id)
  }

  /**
  * Check if item with id exists.
  * @param {K} id Item id
  * @returns {boolean} Whether the item exists
  */
  has (id) {
    return this.#items.has(id)
  }

  /**
  * List all items in repository.
  * @returns {IterableIterator<T>} Items
  */
  list () {
    return this.#items.values()
  }

  /**
  * Remove item by id.
  * @param {K} id Item id
  * @returns {boolean} Whether any item was deleted
  */
  remove (id) {
    return this.#items.delete(id)
  }

  /**
  * Check if item exists.
  * @param {T} item Item
  * @returns {boolean} Whether the item exists
  */
  hasItem (item) {
    return this.#items.has(this.#idMapper(item))
  }

  /**
  * Remove item.
  * @param {T} item Item
  * @returns {boolean} Whether any item was deleted
  */
  removeItem (item) {
    return this.#items.delete(this.#idMapper(item))
  }
}

/**
* Create an id mapper that grabs the given field of the object.
* @returns {RepositoryIdMapper}
*/
export function fieldIdMapper (field) {
  return v => v[field]
}

/**
* Create an id mapper that grabs the `id` field of the object.
* @returns {RepositoryIdMapper}
*/
export function idFieldMapper () {
  return v => v.id
}

/**
* Create an item merger that uses Object.assign to update the object without
* changing the reference.
* @returns {RepositoryItemMerger}
*/
export function assignMerger () {
  return (current, update) => Object.assign(current, update)
}
