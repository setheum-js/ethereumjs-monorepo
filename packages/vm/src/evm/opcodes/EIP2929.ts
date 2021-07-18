import { Address, BN } from 'ethereumjs-util'
import { EIP2929StateManager } from '../../state/interface'
import { RunState } from './../interpreter'

/**
 * Adds address to accessedAddresses set if not already included.
 * Adjusts cost incurred for executing opcode based on whether address read
 * is warm/cold. (EIP 2929)
 * @param {RunState} runState
 * @param {BN}       address
 */
export function accessAddressEIP2929(
  runState: RunState,
  address: Address,
  chargeGas = true,
  isSelfdestruct = false
): BN {
  if (!runState._common.isActivatedEIP(2929)) return new BN(0)

  const addressStr = address.buf

  // Cold
  if (!(<EIP2929StateManager>runState.stateManager).isWarmedAddress(addressStr)) {
    // eslint-disable-next-line prettier/prettier
    (<EIP2929StateManager>runState.stateManager).addWarmedAddress(addressStr)

    // CREATE, CREATE2 opcodes have the address warmed for free.
    // selfdestruct beneficiary address reads are charged an *additional* cold access
    if (chargeGas) {
      return new BN(runState._common.param('gasPrices', 'coldaccountaccess'))
    }
    // Warm: (selfdestruct beneficiary address reads are not charged when warm)
  } else if (chargeGas && !isSelfdestruct) {
    return new BN(runState._common.param('gasPrices', 'warmstorageread'))
  }
  return new BN(0)
}

/**
 * Adds (address, key) to accessedStorage tuple set if not already included.
 * Adjusts cost incurred for executing opcode based on whether storage read
 * is warm/cold. (EIP 2929)
 * @param {RunState} runState
 * @param {Buffer} key (to storage slot)
 */
export function accessStorageEIP2929(runState: RunState, key: Buffer, isSstore: boolean): BN {
  if (!runState._common.isActivatedEIP(2929)) return new BN(0)

  const address = runState.eei.getAddress().buf

  const slotIsCold = !(<EIP2929StateManager>runState.stateManager).isWarmedStorage(address, key)

  // Cold (SLOAD and SSTORE)
  if (slotIsCold) {
    // eslint-disable-next-line prettier/prettier
    (<EIP2929StateManager>runState.stateManager).addWarmedStorage(address, key)
    return new BN(runState._common.param('gasPrices', 'coldsload'))
  } else if (!isSstore) {
    return new BN(runState._common.param('gasPrices', 'warmstorageread'))
  }
  return new BN(0)
}

/**
 * Adjusts cost of SSTORE_RESET_GAS or SLOAD (aka sstorenoop) (EIP-2200) downward when storage
 * location is already warm
 * @param  {RunState} runState
 * @param  {Buffer}   key          storage slot
 * @param  {number}   defaultCost  SSTORE_RESET_GAS / SLOAD
 * @param  {string}   costName     parameter name ('reset' or 'noop')
 * @return {number}                adjusted cost
 */
export function adjustSstoreGasEIP2929(
  runState: RunState,
  key: Buffer,
  defaultCost: number,
  costName: string
): BN {
  if (!runState._common.isActivatedEIP(2929)) return new BN(defaultCost)

  const address = runState.eei.getAddress().buf
  const warmRead = runState._common.param('gasPrices', 'warmstorageread')
  const coldSload = runState._common.param('gasPrices', 'coldsload')

  if ((<EIP2929StateManager>runState.stateManager).isWarmedStorage(address, key)) {
    switch (costName) {
      case 'reset':
        return new BN(defaultCost).isubn(coldSload)
      case 'noop':
        return new BN(warmRead)
      case 'initRefund':
        return new BN(runState._common.param('gasPrices', 'sstoreInitGasEIP2200')).isubn(warmRead)
      case 'cleanRefund':
        return new BN(runState._common.param('gasPrices', 'sstoreReset'))
          .isubn(coldSload)
          .isubn(warmRead)
    }
  }

  return new BN(defaultCost)
}
