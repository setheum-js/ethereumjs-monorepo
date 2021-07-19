import { BN } from 'ethereumjs-util'
import { RunState } from './../interpreter'
import { ERROR } from '../../exceptions'
import { adjustSstoreGasEIP2929 } from './EIP2929'
import { trap } from './util'

/**
 * Adjusts gas usage and refunds of SStore ops per EIP-2200 (Istanbul)
 *
 * @param {RunState} runState
 * @param {any}      found
 * @param {Buffer}   value
 */
export function updateSstoreGasEIP2200(
  runState: RunState,
  found: any,
  value: Buffer,
  key: Buffer
): BN {
  const { original, current } = found
  // Fail if not enough gas is left
  if (
    runState.eei.getGasLeft().lten(runState._common.param('gasPrices', 'sstoreSentryGasEIP2200'))
  ) {
    trap(ERROR.OUT_OF_GAS)
  }

  // Noop
  if (current.equals(value)) {
    const sstoreNoopCost = runState._common.param('gasPrices', 'sstoreNoopGasEIP2200')
    return adjustSstoreGasEIP2929(runState, key, sstoreNoopCost, 'noop')
  }
  if (original.equals(current)) {
    // Create slot
    if (original.length === 0) {
      return new BN(runState._common.param('gasPrices', 'sstoreInitGasEIP2200'))
    }
    // Delete slot
    if (value.length === 0) {
      runState.eei.refundGas(
        new BN(runState._common.param('gasPrices', 'sstoreClearRefundEIP2200')),
        'EIP-2200 -> sstoreClearRefundEIP2200'
      )
    }
    // Write existing slot
    return new BN(runState._common.param('gasPrices', 'sstoreCleanGasEIP2200'))
  }
  if (original.length > 0) {
    if (current.length === 0) {
      // Recreate slot
      runState.eei.subRefund(
        new BN(runState._common.param('gasPrices', 'sstoreClearRefundEIP2200')),
        'EIP-2200 -> sstoreClearRefundEIP2200'
      )
    } else if (value.length === 0) {
      // Delete slot
      runState.eei.refundGas(
        new BN(runState._common.param('gasPrices', 'sstoreClearRefundEIP2200')),
        'EIP-2200 -> sstoreClearRefundEIP2200'
      )
    }
  }
  if (original.equals(value)) {
    if (original.length === 0) {
      // Reset to original non-existent slot
      const sstoreInitRefund = runState._common.param('gasPrices', 'sstoreInitRefundEIP2200')
      runState.eei.refundGas(
        adjustSstoreGasEIP2929(runState, key, sstoreInitRefund, 'initRefund'),
        'EIP-2200 -> initRefund'
      )
    } else {
      // Reset to original existing slot
      const sstoreCleanRefund = runState._common.param('gasPrices', 'sstoreCleanRefundEIP2200')
      runState.eei.refundGas(
        adjustSstoreGasEIP2929(runState, key, sstoreCleanRefund, 'cleanRefund'),
        'EIP-2200 -> cleanRefund'
      )
    }
  }
  // Dirty update
  return new BN(runState._common.param('gasPrices', 'sstoreDirtyGasEIP2200'))
}
