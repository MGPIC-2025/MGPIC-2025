///|
let setted_attack_blocks : Set[(Int, Int)] = Set::new()

///|
let setted_move_blocks : Set[(Int, Int)] = Set::new()

///|
let setted_transfer_blocks : Set[(Int, Int)] = Set::new()

///|
let setted_can_summon_blocks : Set[(Int, Int)] = Set::new()

///|
priv enum IgnoreBlock {
  Attack
  Move
  Summon
}

///|
fn check_and_reset_block(
  position : (Int, Int),
  ignore_block : IgnoreBlock,
) -> Unit {
  // 清除攻击块时，检查是否需要恢复移动块或转移块
  if ignore_block is Attack {
    if setted_move_blocks.contains(position) {
      set_move_block(position)
    } else if setted_transfer_blocks.contains(position) {
      set_attack_block(position)
    } else if setted_can_summon_blocks.contains(position) {
      set_can_summon_blocks(position)
    }
  }
  // 清除移动块时，检查是否需要恢复攻击块或转移块
  if ignore_block is Move {
    if setted_attack_blocks.contains(position) {
      set_attack_block(position)
    } else if setted_transfer_blocks.contains(position) {
      set_attack_block(position)
    } else if setted_can_summon_blocks.contains(position) {
      set_can_summon_blocks(position)
    }
  }
  if ignore_block is Summon {
    if setted_attack_blocks.contains(position) {
      set_attack_block(position)
    } else if setted_transfer_blocks.contains(position) {
      set_attack_block(position)
    } else if setted_move_blocks.contains(position) {
      set_move_block(position)
    }
  }
}
