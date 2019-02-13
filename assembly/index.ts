import 'allocator/arena'
import * as eth from './ethereum'
import * as debug from './debug'
import { OPCODE } from './opcode'
import { Stack } from './stack'

let pc: u32 = 0
const stack: Stack = new Stack()
let resultOffset: u32 = 0

export function main(length: u32): void {
  resultOffset = length + 1
  while (pc < length) {
    const opcode: u8 = load<u8>(pc++)
    runOpcode(opcode)
  }
}

export function runOpcode(opcode: u8): void {
  switch (opcode) {
    case OPCODE.STOP: {
      eth.finish(resultOffset, 1)
      break
    }
    case OPCODE.ADD: {
      const v1 = stack.pop()
      const v2 = stack.pop()
      stack.push(v1 + v2)
      break
    }
    case OPCODE.MUL: {
      stack.push(stack.pop() * stack.pop())
      break
    }
    case OPCODE.SUB: {
      const v1 = stack.pop()
      const v2 = stack.pop()
      stack.push(v1 - v2)
      break
    }
    case OPCODE.DIV: {
      const v1 = stack.pop()
      const v2 = stack.pop()
      if (v2 === 0) unreachable()
      stack.push(v1 / v2)
      break
    }
    case OPCODE.NUMBER: {
      break
    }
    case OPCODE.MLOAD: {
      const offset = stack.pop()
      // FIXME: Should load word, not byte
      const val: u8 = load<u8>(offset)
      stack.push(val)
      break
    }
    case OPCODE.MSTORE8: {
      const offset = stack.pop()
      const b = stack.pop()
      store<u8>(offset, b)
      break
    }
    case OPCODE.PUSH1: {
      const val: u8 = load<u8>(pc++)
      stack.push(val)
      break
    }
    case OPCODE.CALL: {
      const addressOffset = stack.pop()
      const valueOffset = stack.pop()
      const dataOffset = stack.pop()
      const dataLength = stack.pop()
      const res: u8 = eth.call(addressOffset, valueOffset, dataOffset, dataLength)
      stack.push(res)
      break
    }
    case OPCODE.RETURN: {
      store<u8>(resultOffset, stack.pop())
      break
    }
  }
}