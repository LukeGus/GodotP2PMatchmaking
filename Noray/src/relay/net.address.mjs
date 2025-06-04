/* eslint-disable */
import dgram from 'node:dgram'
/* eslint-enable */

export class NetAddress {
  /** @type {string} */
  address

  /** @type {number} */
  port

  /**
  * @param {NetAddress} options
  */
  constructor (options) {
    options && Object.assign(this, options)
  }

  /**
  * Check for equality
  * @param {NetAddress} other Other
  * @returns {boolean} True if equal
  */
  equals (other) {
    return this.address === other.address && this.port === other.port
  }

  toString () {
    return `${this.address}:${this.port}`
  }

  /**
  * @param {dgram.RemoteInfo} rinfo
  * @returns {NetAddress}
  */
  static fromRinfo (rinfo) {
    return new NetAddress({
      address: rinfo.address,
      port: rinfo.port
    })
  }
}
