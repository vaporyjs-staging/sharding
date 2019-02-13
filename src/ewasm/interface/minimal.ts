/**
 * @module ewasm
 */
const assert = require('assert')
import BN = require('bn.js')
import { VmError, ERROR, FinishExecution } from '../../exceptions'
import Memory from '../memory'
import { OPCODE } from '../../../assembly/opcode'

const ENV_CONTRACT = Buffer.from([0x10])

export default class Minimal {
  init: Buffer
  _data: any
  _results: any
  _memory: any

  constructor(data: any) {
    this._data = data
    this.init = data.init
    this._results = {
      gasUsed: new BN(0),
    }
  }

  get imports() {
    return {
      ethereum: this.ethereum,
      debug: {
        log: (m: number) => {
          console.log('log', m)
        },
      },
      env: {
        abort: () => {
          throw new Error('abort')
        },
      },
    }
  }

  get ethereum() {
    return {
      call: this.call.bind(this),
      finish: this.finish.bind(this),
    }
  }

  call(addressOffset: number, valueOffset: number, dataOffset: number, dataLength: number): number {
    // For now all values are 1 byte
    const address = this._memory.read(addressOffset, 1)
    const value = this._memory.read(valueOffset, 1)
    const data = this._memory.read(dataOffset, dataLength)

    // Special contract call for fetching env data
    // NOTE: currently, contracts should send evm opcode
    // (e.g. 0x43 for NUMBER) as data.
    if (Buffer.from(address).equals(ENV_CONTRACT)) {
      if (Buffer.from(data).equals(Buffer.from([OPCODE.NUMBER]))) {
        return this._data.blockNumber
      }
    } else {
      throw new VmError('Not implemented')
    }

    return 0
  }

  /**
   * Set the returning output data for the execution.
   * This will halt the execution immediately.
   * @param offset - The memory offset of the output data
   * @param length - The length of the output data
   * @throws FinishExecution
   */
  finish(offset: number, length: number) {
    let ret = Buffer.from([])
    if (length) {
      ret = Buffer.from(this._memory.read(offset, length))
    }

    // 1 = success
    this._results.exception = 1
    this._results.return = ret

    throw new FinishExecution('WASM execution finished, should halt')
  }

  /**
   * Set the returning output data for the execution. This will
   * halt the execution immediately and set the execution
   * result to "reverted".
   * @param offset - The memory offset of the output data
   * @param length - The length of the output data
   * @throws VmError
   */
  revert(offset: number, length: number) {
    let ret = Buffer.from([])
    if (length) {
      ret = Buffer.from(this._memory.read(offset, length))
    }

    this._results.exception = 0
    this._results.exceptionError = ERROR.REVERT
    this._results.gasUsed = this._data.gasLimit
    this._results.return = ret

    throw new VmError(ERROR.REVERT)
  }

  setMemory(memory: Memory) {
    this._memory = memory
  }
}