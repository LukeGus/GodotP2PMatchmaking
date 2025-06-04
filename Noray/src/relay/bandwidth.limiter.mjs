import assert from 'node:assert'
import { requireParam } from '../assertions.mjs'
import { time } from '../utils.mjs'

/**
* Generic component to limit bandwidth usage.
*
* Internally, the bandwidth limiter divides chunks into time slices of
* `interval` length. Every time slice is allocated a certain amount of data
* transfer based on the max traffic specified in bytes/sec ( i.e. if interval
* is 1/8th of a second, then the max traffic for a time slice is 1/8th of the
* max traffic ).
*
* For any traffic that is within the limit, the counter is increased and the
* validation passes. Once the time slice expires, the counter is reset and a
* new one is started.
*/
export class BandwidthLimiter {
  #interval
  #maxTraffic
  #traffic
  #lastInterval

  /**
  * Construct instance.
  * @param {object} options Options
  * @param {number} options.maxTraffic Traffic limit in bytes/sec
  * @param {number} options.interval Traffic interval length in seconds
  */
  constructor (options) {
    this.#interval = options.interval ?? 1
    this.#maxTraffic = requireParam(options.maxTraffic)
    this.#traffic = 0
    this.#lastInterval = time()
  }

  /**
  * Validate that a given size of data fits into the bandwidth limit.
  * @param {number} size Data size
  * @throws if traffic is over limit
  */
  validate (size) {
    // If we're past the last interval, start a new one
    if (time() > this.#lastInterval + this.#interval) {
      this.#lastInterval = time()
      this.#traffic = size
      return
    }

    const limit = this.#maxTraffic * this.#interval
    assert(this.#traffic + size <= limit, 'Bandwidth limit reached!')

    this.#traffic += size
  }
}
